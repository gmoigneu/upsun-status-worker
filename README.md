# Upsun Status

This worker is intended to be deployed on Cloudflare. It requires a Worker and a KV database.

Configure the KV binding in `wrangler.toml`.


## Process
You can test locally with `wrangler dev`
Deploy it with `wrangler deploy`

## Debug
You can query the KV database like this:

- `wrangler kv:key put --binding=WOOPLY_STATUS {KEY} 1`
- `wrangler kv:key get --binding=WOOPLY_STATUS {KEY}`