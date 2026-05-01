import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECIPIENT_EMAIL = 'voieveritevie3v@gmail.com';
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { name, email, type, subject, message } = await req.json();

    // Validate required fields
    if (!name || !email || !type || !message) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs sont requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Format d\'email invalide' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Insert message into database
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        type,
        subject: subject || `Message de ${name}`,
        message,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Contact message submitted successfully: ${data.id}`);

    // Send email notification via Resend
    try {
      const typeLabels: Record<string, string> = {
        question: 'Question',
        prayer: 'Demande de prière',
        testimony: 'Témoignage',
        suggestion: 'Suggestion',
        other: 'Autre'
      };

      const emailResult = await resend.emails.send({
        from: 'Voie Vérité Vie <noreply@resend.dev>',
        to: [RECIPIENT_EMAIL],
        subject: `[3V] ${typeLabels[type] || type}: ${subject || 'Nouveau message'}`,
        html: `
          <h2>Nouveau message de contact</h2>
          <p><strong>De:</strong> ${name} (${email})</p>
          <p><strong>Type:</strong> ${typeLabels[type] || type}</p>
          <p><strong>Sujet:</strong> ${subject || 'Non spécifié'}</p>
          <hr/>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br/>')}</p>
          <hr/>
          <p style="color: #666; font-size: 12px;">
            Message envoyé depuis le formulaire de contact de Voie Vérité Vie
          </p>
        `,
      });

      console.log('Email sent successfully:', emailResult);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails - message is already saved in DB
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Votre message a été envoyé avec succès. Nous vous répondrons à votre adresse email.',
        id: data.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in submit-contact function:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de l\'envoi du message' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
