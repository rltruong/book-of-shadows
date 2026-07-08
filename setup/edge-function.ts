// Edge Function: suggest-keepsakes
//
// Paste this into Supabase: Edge Functions → Deploy a new function → Via Editor.
// Name the function exactly:  suggest-keepsakes
//
// It relays the app's suggestion request to Anthropic using an API key stored
// as a Supabase secret (ANTHROPIC_API_KEY) — the key never reaches the browser.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Preflight request from the browser
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY secret is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { userMessage } = await req.json();
    if (!userMessage || typeof userMessage !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing userMessage' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const bodyText = await anthropicRes.text();
    if (!anthropicRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API ' + anthropicRes.status + ': ' + bodyText.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Pass the Anthropic message object straight through; the app parses it.
    return new Response(bodyText, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
