# Larp Apps

Two iPhone home-screen web apps with pretend money. Everything is stored on the device. Nothing is real money or a real card.

- **Nebula** (`nebula/`): a crypto wallet. It has editable token balances and prices, a live price ticker, charts, send/receive/swap/buy flows, an activity history you can add to, collectibles from your own photos, and Explore.
- **Pocket** (`pocket/`): a card wallet. Make cards from any photo or preset design, set balances, add or generate transactions, and use a Pay screen with Face ID and "Hold Near Reader".

Both apps have:
- A Face ID lock: Simulated mode, or Device mode, which uses the iPhone's real Face ID through a passkey.
- A passcode fallback, auto-lock and app-switcher blur.
- Haptics (iOS 18+), swipe-down sheets, edge-swipe back and offline support.
- Card shine that follows the phone's tilt (Pocket).

## Deploy to GitHub Pages

1. Create a new GitHub repo and push this folder to it. `index.html` must be at the repo root.
2. In the repo, go to **Settings → Pages**. Under **Source**, pick **Deploy from a branch**, then choose `main` and `/ (root)`.
3. After a minute the site is live at `https://<username>.github.io/<repo>/`.
4. On your iPhone, open that URL in **Safari**, open an app, then tap **Share → Add to Home Screen**. Do this once for each app.

After changing files, bump `VERSION` in `sw.js` so installed apps pick up the update. The update shows on the second launch.

## Local preview

```
node tools/serve.mjs
```

Then open http://localhost:5173. Regenerate the icons with `node tools/make-icons.mjs`.
