"""Classify recorded Gmail evidence; a Sent/Inbox label alone does not prove delivery."""
import re

def text_parts(part):
    if not part:return []
    own=[part.get('body',{}).get('content') or ''] if part.get('mime_type','').startswith('text/') else []
    return own+[text for child in part.get('parts') or [] for text in text_parts(child)]

def header(message,name):
    return next((x['value'] for x in message.get('payload',{}).get('headers',[]) if x['name'].lower()==name.lower()),'')

def classify(sent,notices,recipient_copy=None):
    mid=header(sent,'message-id').strip();recipient=header(sent,'to')
    for notice in notices:
        text='\n'.join(text_parts(notice.get('payload')))
        originals=re.findall(r'^Message-ID:\s*(<[^>]+>)',text,re.I|re.M)
        if mid and mid in originals and re.search(r'^Action:\s*failed\s*$',text,re.I|re.M):
            status=re.search(r'^Status:\s*([^\r\n]+)',text,re.I|re.M)
            diagnostic=re.search(r'^Diagnostic-Code:\s*([^\r\n]+)',text,re.I|re.M)
            return {'status':'rejected','dsn':status.group(1) if status else None,'reason':diagnostic.group(1) if diagnostic else '', 'retry_automatically':False,'resume_batch':False,'notice_id':notice.get('id')}
    # Must be an independently read recipient mailbox, not the sender's own Sent copy.
    if recipient_copy and recipient_copy.get('independent_mailbox') and header(recipient_copy,'message-id').strip()==mid:
        return {'status':'recipient_copy_verified','retry_automatically':False,'recipient':recipient}
    return {'status':'provider_accepted_delivery_unconfirmed','retry_automatically':False,'resume_batch':False,'recipient':recipient}
