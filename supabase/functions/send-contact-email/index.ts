import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, subject, message }: ContactEmailRequest = await req.json();

    console.log("Processing contact form submission:", { name, email, subject });

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save message to database
    const { data: messageData, error: messageError } = await supabase
      .from("contact_messages")
      .insert({
        name,
        email,
        phone,
        subject,
        message,
        status: "pending",
      })
      .select()
      .single();

    if (messageError) {
      console.error("Error saving message:", messageError);
      throw messageError;
    }

    console.log("Message saved to database:", messageData.id);

    // Get active recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("contact_recipients")
      .select("email, name")
      .eq("is_active", true);

    if (recipientsError) {
      console.error("Error fetching recipients:", recipientsError);
      throw recipientsError;
    }

    if (!recipients || recipients.length === 0) {
      console.warn("No active recipients found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Message saved but no recipients configured",
          id: messageData.id 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending emails to ${recipients.length} recipients`);

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        const emailResponse = await resend.emails.send({
          from: "CardápioPronto <onboarding@resend.dev>",
          to: [recipient.email],
          subject: `Nova mensagem de contato: ${subject}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e3a8a;">Nova mensagem de contato</h2>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Nome:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ''}
                <p><strong>Assunto:</strong> ${subject}</p>
              </div>
              
              <div style="margin: 20px 0;">
                <p><strong>Mensagem:</strong></p>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>
              
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
              
              <p style="color: #6b7280; font-size: 14px;">
                Esta mensagem foi enviada através do formulário de contato do CardápioPronto.
              </p>
            </div>
          `,
        });

        console.log(`Email sent to ${recipient.email}:`, emailResponse);
        return { success: true, recipient: recipient.email };
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        return { success: false, recipient: recipient.email, error };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter(r => r.success).length;
    
    console.log(`Emails sent: ${successCount}/${recipients.length}`);

    // Send confirmation email to the sender
    try {
      await resend.emails.send({
        from: "CardápioPronto <onboarding@resend.dev>",
        to: [email],
        subject: "Recebemos sua mensagem!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Mensagem recebida com sucesso!</h2>
            
            <p>Olá ${name},</p>
            
            <p>Recebemos sua mensagem e entraremos em contato o mais breve possível.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Resumo da sua mensagem:</strong></p>
              <p><strong>Assunto:</strong> ${subject}</p>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            
            <p>Obrigado por entrar em contato!</p>
            
            <p style="margin-top: 30px;">
              Atenciosamente,<br>
              <strong>Equipe CardápioPronto</strong>
            </p>
          </div>
        `,
      });
      console.log("Confirmation email sent to sender");
    } catch (error) {
      console.error("Error sending confirmation email:", error);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Mensagem enviada com sucesso!",
        id: messageData.id,
        emailsSent: successCount,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
