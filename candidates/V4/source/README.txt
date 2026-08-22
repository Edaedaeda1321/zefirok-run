V4.1 is Candidate-only.
The full LOCAL game shell is restored inside candidates/V4 so legal documents, Battle Pass, rating and referrals remain inside the Candidate tree.
Production index.html, src/worker.js, D1 and test-project.html are not modified.
LOCAL/TP pages use the fail-closed LOCAL 2.2 runtime: /api/* is handled locally or returns LOCAL_API_NOT_IMPLEMENTED; external network is blocked.
The coffee card is a startup popup over the game, not a separate page.
