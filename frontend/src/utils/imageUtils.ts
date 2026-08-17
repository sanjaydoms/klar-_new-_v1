/**
 * Probes an image URL and returns its natural dimensions.
 *
 * Resolves `null` when the image cannot be loaded. Callers MUST drop those
 * entries rather than substituting neutral values: a URL that 404s still
 * renders as a broken <img>, and counting it produced the "19 Photos / 0
 * visible" gallery. The probe is the only place we learn an image is dead, so
 * it is the only place that can honestly filter it.
 */
export const getImageDimensions = (
  url: string,
): Promise<{ width: number; height: number; ratio: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      // A decoded image with no intrinsic size is a placeholder/tracking pixel
      // as far as a gallery is concerned — treat it as unusable.
      if (!width || !height) {
        resolve(null);
        return;
      }
      resolve({ width, height, ratio: height / width });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/** Probe in bounded batches so a 60-image hotel doesn't open 60 sockets at once. */
const PROBE_CONCURRENCY = 10;

const probeAll = async (
  urls: string[],
): Promise<Array<{ url: string; width: number; height: number; ratio: number }>> => {
  const results: Array<{
    url: string;
    width: number;
    height: number;
    ratio: number;
  }> = [];

  for (let i = 0; i < urls.length; i += PROBE_CONCURRENCY) {
    const batch = urls.slice(i, i + PROBE_CONCURRENCY);
    const dims = await Promise.all(
      batch.map(async (url) => {
        const d = await getImageDimensions(url);
        return d ? { url, ...d } : null;
      }),
    );
    for (const d of dims) {
      if (d) results.push(d);
    }
  }

  return results;
};

/**
 * Filters an array of image URLs down to the ones that actually load, sorted
 * for gallery display.
 *
 * Every URL is probed — there is no unprobed tail. An earlier version capped
 * the probe at the first 15 and appended the rest unchecked, so hotels with
 * more than 15 images kept reporting a count that included URLs nothing had
 * ever verified.
 *
 * Ordering considers both resolution (area) and how closely the aspect ratio
 * fits `targetRatio` (~1.3 for the main gallery hero slot).
 *
 * Returns [] when nothing loads. Callers must render an explicit empty state
 * for that case, NOT a placeholder image.
 */
export const sortHotelImagesByDimensions = async (
  urls: string[],
  targetRatio: number = 1.298,
): Promise<string[]> => {
  if (!urls || urls.length === 0) return [];

  try {
    const dimensions = await probeAll(urls);

    return dimensions
      .sort((a, b) => {
        // First compare by how well they fit the target aspect ratio
        const fitA = Math.abs(a.ratio - 1 / targetRatio); // ratio is h/w, targetRatio is w/h
        const fitB = Math.abs(b.ratio - 1 / targetRatio);

        if (Math.abs(fitA - fitB) > 0.15) {
          return fitA - fitB;
        }

        // If fit is similar (within 15%), use area (resolution) as tie-breaker
        return b.width * b.height - a.width * a.height;
      })
      .map((d) => d.url);
  } catch (error) {
    // A probe failure is not a reason to publish unverified URLs — but it is
    // also not a reason to blank a gallery that may be fine. Fall back to the
    // input and let the <img> error handlers catch individual failures.
    console.error('Error sorting images by dimensions:', error);
    return urls;
  }
};
