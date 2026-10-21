# Private video: deferred by the user

Current capability: `privateVideo: false`. No video upload, processing, playback, queue or paid dependency is installed. Existing public exercise illustrations are original lightweight SVGs, not externally licensed videos.

The existing private image Module already uses the real Storage Adapter Seam (S3 / isolated demo DB). A future video feature should extend that seam with validated media metadata, bounded uploads, queued/processing/ready/failed states, per-request participant authorization, deletion and backup references. Processing needs its own provider, retry policy and resource budget before video is enabled. Do not route video through Sharp or return publicly reusable URLs for private content. User-facing video controls remain absent until the complete path is implemented and tested.
