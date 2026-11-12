import unittest,re
from email import message_from_bytes
from email.policy import default
from build_email import build
from delivery_status import classify

class EmailTests(unittest.TestCase):
    def test_send_structure_and_art(self):
        m,p,h,t=build('artificialmindhive@gmail.com','Austin','https://www.amhsiterevival.com/creator-page/','links')
        parsed=message_from_bytes(m.as_bytes(),policy=default)
        self.assertEqual(parsed.get_content_type(),'multipart/alternative')
        related=parsed.get_payload()[1];self.assertEqual(related.get_content_type(),'multipart/related')
        images=[x for x in related.iter_parts() if x.get_content_maintype()=='image']
        self.assertEqual(len(images),3)
        self.assertEqual(set(re.findall(r'cid:([^"]+)',h)),{x['Content-ID'].strip('<>') for x in images})
        self.assertTrue(all(x.get_content_disposition()=='inline' and x.get_filename() for x in images))
        self.assertNotIn('data:image',h);self.assertNotIn('message/rfc822',m.as_string())
    def test_intro_copy_and_injection(self):
        m,p,h,t=build('owner@example.com','A & B','https://example.com/preview/')
        self.assertEqual(len(re.findall('href=',h)),1);self.assertIn('private preview',t)
        self.assertNotIn('400k',t);self.assertNotIn('it\'s indexed',t);self.assertIn('no thanks',t)
        self.assertIn('A &amp; B',h)
        with self.assertRaises(ValueError):build('owner@example.com\nBcc: other@example.com','Name','https://example.com')
    def test_late_bounce_overrides_sent_and_inbox(self):
        sent={'id':'s','label_ids':['SENT','INBOX'],'payload':{'headers':[{'name':'Message-ID','value':'<one@example.com>'}]}}
        notice={'id':'bounce','payload':{'mime_type':'text/plain','body':{'content':'Action: failed\r\nStatus: 5.7.1\r\nDiagnostic-Code: smtp; Message rejected\r\nMessage-ID: <one@example.com>\r\n'}}}
        self.assertEqual(classify(sent,[])['status'],'provider_accepted_delivery_unconfirmed')
        self.assertEqual(classify(sent,[notice])['status'],'rejected')
        self.assertFalse(classify(sent,[notice])['retry_automatically'])
        notice['payload']['body']['content']=notice['payload']['body']['content'].replace('<one@example.com>','<different@example.com>')
        self.assertNotEqual(classify(sent,[notice])['status'],'rejected')

if __name__=='__main__':unittest.main()
