Cirklebook Final Redesign Package

Replace in C:\CirkleBook\frontend\
- index.html
- styles.css
- app.js
- copy the assets folder into C:\CirkleBook\frontend\assets\

Then hard refresh with Ctrl+F5.

Implemented in this frontend package:
- Cirklebook official logo assets
- Redesigned login screen with Log In / Forgotten password / Create new account
- Facebook-like top navigation layout using Cirklebook custom icons
- Language selector (English default + Bangla, Arabic, Urdu, Hindi, Chinese, Portuguese, Russian, French, Spanish, Malay, Indonesian)
- Home composer with Live / Photo-Video / Feeling actions on the right
- Facebook-like Create Post panel with policy notice and Add to your post controls
- Camera/microphone Live Video setup preview
- Full-page Profile and About layout, Verification Badge entry
- Professional Dashboard + Monetization eligibility
- Pages hub + Create a Page with live preview
- Ads Center, Boost Post flow UI
- Islamic Community Standards, AI moderation workflow UI
- Messenger, Video/Reels hub, Moderator/Admin dashboard UI foundations
- 4 sponsored advertisement boxes, Contacts section removed
- responsive desktop/tablet/mobile styling

Important backend dependencies:
Some features need backend endpoints/services that are not present in the uploaded frontend files. The UI is ready, but real operation requires backend support for: password recovery, messaging sync, verification document/payment processing, live streaming, AI media/audio moderation, ad payments/campaign delivery, creator payouts, admin/moderator queues, and full internationalization content APIs.

Existing backend-supported features (login, feed, post/media upload, profile, pages, groups etc.) continue to use the existing APIs.
