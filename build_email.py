"""Build email-safe AMH messages. Generates files only; never sends mail."""
from pathlib import Path
from email.message import EmailMessage
from email.policy import SMTP
from email.utils import formatdate, make_msgid
from html import escape
from urllib.parse import urlparse
import argparse, base64, json, re

ROOT = Path(__file__).parent
ASSETS = ROOT / 'assets'
FROM = 'artificialmindhive@gmail.com'
LANDING = 'https://www.amhsiterevival.com/creator-page/'
DIRECTORY = 'https://sites-amh.pages.dev/creators/'

def valid_address(value):
    if not re.fullmatch(r'[^\s@<>,;\r\n]+@[^\s@<>,;\r\n]+\.[^\s@<>,;\r\n]+', value):
        raise ValueError('Use one explicit email address without display names or extra headers')
    return value

def valid_preview(url):
    p = urlparse(url)
    if p.scheme != 'https' or not p.hostname or p.username or p.password or any(c.isspace() for c in url):
        raise ValueError('Preview must be a complete HTTPS URL')
    return url

def content(name, preview, mode):
    raw_name = name;name = escape(name)
    if mode == 'links':
        title = 'YOUR CREATOR PAGES'
        paragraphs = '<p>Austin, your creator landing page and new previews are ready.</p>'
        cta = f'<p><a class="cta" href="{LANDING}">Open the creator page</a></p><p><a class="cta" href="{DIRECTORY}">Browse the previews</a></p>'
        details = '<p>Choose <strong>Recent</strong> in the directory to find the 20 new pages, or search a creator’s name. The cards include preview grades and email/copy controls.</p><p>The landing page includes optional merch details, fan-support links, and full, slower phone walkthroughs with Liana V1 first.</p>'
        plain = f'Austin, your creator pages are ready.\n\nCreator landing page: {LANDING}\n\nAll previews: {DIRECTORY}\nSelect Recent for the 20 new pages, or search a creator name.\n\nThe landing page includes optional merch details, fan-support links, and full, slower phone walkthroughs with Liana V1 first.'
    else:
        title = 'YOUR WEBSITE PREVIEW'
        paragraphs = '<p>Hey, we saw you’ve got quite the online presence, so we made you a site. Your videos, socials, and everything else in one spot.</p><p>Take a look and let me know what you think.</p>'
        cta = f'<p><a class="cta" href="{escape(preview, quote=True)}">View your website preview</a></p>'
        details = '<p>Want anything changed? Just reply here. We can help with hosting, updates, and merch too if you want it.</p><p>It’s a private preview for now. If you like it, we can talk about getting it launched.</p><p>— Austin<br>AMH · Artificial Mind Hive<br>510-694-9699</p><p class="note">If this isn’t for you, reply “no thanks” and we won’t follow up.</p>'
        plain = f'Hey, we saw you’ve got quite the online presence, so we made you a site. Your videos, socials, and everything else in one spot.\n\nTake a look and let me know what you think.\n\n{preview}\n\nWant anything changed? Just reply here. We can help with hosting, updates, and merch too if you want it.\n\nIt’s a private preview for now. If you like it, we can talk about getting it launched.\n\nAustin\nAMH - Artificial Mind Hive\n510-694-9699\n\nIf this isn’t for you, reply no thanks and we won’t follow up.'
    # The same original v3 art, without a forwarded .eml or browser-only data URLs.
    html = f'''<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#02020a;color:#fff;font-family:Arial,sans-serif;line-height:1.6"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#02020a"><tr><td align="center" style="padding:20px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:700px;border:2px solid #b8ff2e;border-radius:22px;background:#0a0a18"><tr><td style="padding:24px;color:#fff"><p style="text-align:center"><img src="cid:header-amh-badge-112.png" width="56" height="56" alt="AMH Site Revival"><br><strong>AMH SITE REVIVAL</strong></p><h1 style="font-size:30px;line-height:1.2;color:#b8ff2e">{title}</h1><img src="cid:space-globe.gif" width="650" alt="AMH animated sun and globe" style="width:100%;max-width:650px;height:auto;border-radius:16px;display:block">{paragraphs}{cta}{details}<p style="text-align:center"><img src="cid:movie-amh-badge-anim.gif" width="112" height="112" alt="Artificial Mind Hive animated logo" style="width:112px;height:112px"></p></td></tr></table></td></tr></table></body></html>'''
    html = html.replace('class="cta"', 'style="display:inline-block;padding:13px 22px;background:#b8ff2e;color:#050510;text-decoration:none;border-radius:12px;font-weight:bold"').replace('class="note"', 'style="font-size:12px;color:#c9c9d4"')
    return plain.replace('Hi '+name+',','Hi '+raw_name+','), html

def build(to, name, preview, mode='intro'):
    valid_address(to)
    if mode == 'intro':valid_preview(preview)
    if '\r' in name or '\n' in name:raise ValueError('Name must fit one line')
    plain, html = content(name, preview, mode)
    subject = 'AMH creator links — illustrated copy' if mode == 'links' else f'A website preview for {name}'
    files = list(dict.fromkeys(re.findall(r'src="cid:([^"]+)"', html)))
    related = [{'mime_type':'text/html','charset':'UTF-8','body':{'content':html}}]
    msg = EmailMessage(policy=SMTP)
    msg['From'] = FROM;msg['To'] = to;msg['Subject'] = subject
    msg['Date'] = formatdate(localtime=False);msg['Message-ID'] = make_msgid(domain='artificialmindhive.com')
    msg.set_content(plain);msg.add_alternative(html, subtype='html')
    for filename in files:
        path = ASSETS / filename
        if path.parent.resolve() != ASSETS.resolve():raise ValueError('Asset path escapes asset directory')
        data = path.read_bytes();subtype = path.suffix[1:]
        msg.get_payload()[1].add_related(data, maintype='image', subtype=subtype, cid='<'+filename+'>', filename=filename, disposition='inline')
        related.append({'mime_type':'image/'+subtype,'filename':filename,'content_id':filename,'content_disposition':'inline','body':{'base64_url_content':base64.urlsafe_b64encode(data).decode().rstrip('=')}})
    payload = {'to':to,'subject':subject,'payload':{'mime_type':'multipart/alternative','parts':[{'mime_type':'text/plain','charset':'UTF-8','body':{'content':plain}},{'mime_type':'multipart/related','parts':related}]}}
    return msg, payload, html, plain

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__);p.add_argument('--to',required=True);p.add_argument('--name',default='Austin');p.add_argument('--preview',default=LANDING);p.add_argument('--mode',choices=['intro','links'],default='intro');p.add_argument('--out',type=Path,default=ROOT/'out/email')
    a=p.parse_args();msg,payload,html,plain=build(a.to,a.name,a.preview,a.mode);a.out.mkdir(parents=True,exist_ok=True)
    (a.out/'message.eml').write_bytes(msg.as_bytes());(a.out/'gmail-payload.json').write_text(json.dumps(payload,ensure_ascii=False),encoding='utf8');(a.out/'message.txt').write_text(plain,encoding='utf8')
    for filename in re.findall(r'src="cid:([^"]+)"',html):html=html.replace('cid:'+filename,(ASSETS/filename).resolve().as_uri())
    (a.out/'preview.html').write_text(html,encoding='utf8');print(json.dumps({'to':a.to,'mode':a.mode,'bytes':len(msg.as_bytes()),'images':sum(x.get_content_maintype()=='image' for x in msg.walk()),'output':str(a.out),'sent':False}))
