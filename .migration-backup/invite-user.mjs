const SUPABASE_URL = "https://kaddsojhnkyfavaulrfc.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthZGRzb2pobmt5ZmF2YXVscmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njg1MjcsImV4cCI6MjA3NzM0NDUyN30.hFAbVxHmfDY1Xqkij62R8dTBfHw6ff5mSb3faq_4CPs";

async function inviteUser() {
  console.log("📧 Attempting to invite ahdybau@gmail.com...\n");

  // Try to create a magic link (passwordless invite)
  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: {
      "apikey": ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "ahdybau@gmail.com",
      data: {
        role: "admin_principal"
      }
    })
  });

  const data = await response.json();
  console.log("Response:", JSON.stringify(data, null, 2));

  if (response.ok) {
    console.log("\n✅ Magic link sent to ahdybau@gmail.com!");
    console.log("   Check your email for login link");
  } else {
    console.log("\n⚠️  Could not send magic link. This is expected with anon key.");
    console.log("   Need to use service_role_key OR create account manually.");
  }
}

inviteUser();
