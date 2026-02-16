import { Hono } from "hono"

const app = new Hono()

/**
 * GET /check?domain=example.com
 */
app.get("/check", async (c) => {
  const domain = c.req.query("domain")

  if (!domain) {
    return c.json(
      { error: "Missing domain query param" },
      400
    )
  }

  try {
    // DNS-over-HTTPS using Google resolver
    const dnsUrl =
      "https://dns.google/resolve" +
      `?name=${encodeURIComponent(domain)}` +
      "&type=NS"

    const res = await fetch(dnsUrl, {
      headers: { "accept": "application/dns-json" }
    })

    if (!res.ok) {
      throw new Error("DNS lookup failed")
    }

    const data = await res.json()

    const answers = data.Answer || []

    const nameservers = answers
      .map(a => a.data?.toLowerCase?.())
      .filter(Boolean)

    const onCloudflare = nameservers.some(ns =>
      ns.includes("cloudflare.com")
    )

    return c.json({
      domain,
      on_cloudflare: onCloudflare,
      status: onCloudflare ? "green" : "red",
      nameservers
    })
  } catch (err) {
    return c.json(
      {
        domain,
        error: err.message,
        status: "unknown"
      },
      500
    )
  }
})

export default app
