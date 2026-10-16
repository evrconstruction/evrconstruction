/**
 * IndexNow — tells search engines a URL changed, instead of waiting to be crawled.
 *
 * Bing, Yandex, Seznam and Naver share one endpoint, so submitting once reaches
 * all of them. Google does not participate: its equivalent (the Indexing API)
 * only accepts JobPosting and BroadcastEvent pages, so it is unusable here.
 *
 * The key is not a secret — the protocol requires it to be published on the site
 * so ownership can be proved. It is read from the environment anyway, so it is
 * never committed and can be rotated without a code change.
 */

/** Shared endpoint, which fans out to every participating engine. */
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Path the key file must be published at for a given key: `/<key>.txt`.
 *
 * The protocol scopes a key to the directory its file sits in, so a key served
 * from `/api/` authorises only `/api/` URLs and every real page would be
 * rejected. The root is the documented Option 1 and the only location that
 * covers the whole site. The submission and the root rewrite both derive the
 * path here, so the two cannot drift apart.
 */
export function indexNowKeyPath(key: string): string {
  return `/${key}.txt`;
}

export interface IndexNowResult {
  configured: boolean;
  submitted: number;
  reason?: string;
  /** HTTP status from IndexNow, when a submission was attempted. */
  httpStatus?: number;
}

/**
 * The key file search engines fetch to confirm we own this host.
 *
 * CrUX and IndexNow treat the key differently on purpose: CrUX keeps it private
 * to the project because it bills quota, IndexNow needs it public because
 * publishing it *is* the ownership proof.
 */
export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key ? key : null;
}

/**
 * Whether a key looks like one IndexNow will accept.
 *
 * The protocol requires 8–128 characters of hex, letters and dashes. Checking
 * here turns a silently rejected submission into a clear message.
 */
export function isValidIndexNowKey(key: string): boolean {
  return /^[A-Za-z0-9-]{8,128}$/.test(key);
}

/**
 * Submit URLs to IndexNow.
 *
 * Returns rather than throws when unconfigured: a site without a key is a
 * legitimate state, and a weekly audit should say so rather than fail.
 */
export async function submitToIndexNow(
  host: string,
  urls: string[]
): Promise<IndexNowResult> {
  const key = indexNowKey();

  if (!key) {
    return {
      configured: false,
      submitted: 0,
      reason:
        "INDEXNOW_KEY is not set, so Bing and its partners are not being told when pages change.",
    };
  }

  if (!isValidIndexNowKey(key)) {
    return {
      configured: false,
      submitted: 0,
      reason:
        "INDEXNOW_KEY is set but is not a valid key. IndexNow accepts 8–128 characters of letters, digits and dashes.",
    };
  }

  if (urls.length === 0) {
    return { configured: true, submitted: 0 };
  }

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation: `https://${host}${indexNowKeyPath(key)}`,
      urlList: urls,
    }),
    cache: "no-store",
  });

  // IndexNow answers 200 for accepted, 202 for accepted-but-key-pending.
  // Anything else means the submission was rejected, so it is reported as a
  // failure rather than counted as sent.
  if (res.status !== 200 && res.status !== 202) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `IndexNow rejected the submission with HTTP ${res.status}. ${body.slice(0, 200)}`
    );
  }

  return { configured: true, submitted: urls.length, httpStatus: res.status };
}
