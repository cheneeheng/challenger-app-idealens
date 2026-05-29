# Account & API Key

Everything about managing your account lives on the **Settings** page (`/settings`). Settings
stays accessible even before you've added an API key, so you can always get set up or make changes.

## Your API key

IdeaLens uses *your* Anthropic API key for every analysis.

### Adding or replacing your key

1. Go to **Settings**.
2. Paste your Anthropic API key into the API key field and save.
3. The key is **encrypted at rest**. After saving, it is never shown back to you — you only
   see whether a key is currently set. To change it, paste a new key and save again, which
   replaces the old one.

### Why a key is required

Without a saved key, the AI has no way to run an analysis. The **Dashboard** and the analysis
workspace stay locked until a key is present; **Settings** remains open so you can add one.

> Your key is billed through your own Anthropic account. Keep an eye on usage in the
> [Anthropic Console](https://console.anthropic.com/).

## Changing your password

1. Go to **Settings**.
2. In the **Password** section, enter your **current password**, then your **new password**
   twice (the two new-password fields must match).
3. Save.

You stay signed in after changing your password.

## Updating your profile

In the **Profile** section of **Settings** you can update your **display name** and **email**,
then save.

## Signing out

Use the sign-out control in the header. This ends your session on this device. Your analyses
and graphs are saved and will be there when you sign back in.

## Deleting your account

Deleting your account is **permanent**. It removes your profile, your saved API key, and all
of your analyses (conversations and graphs). This cannot be undone. In the **Danger zone** of
**Settings**, choose **Delete account**, then enter your password in the confirmation dialog
to delete permanently.

## Your data and privacy

- Your analyses are scoped to your account — other users cannot see them.
- Your API key is encrypted before storage and never displayed after saving.
- Idea content you submit is sent to Anthropic's API (using your key) to produce the analysis.

## Next

- [FAQ & Troubleshooting](faq.md) — common questions and fixes.
