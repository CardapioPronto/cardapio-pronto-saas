import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendManagedEmail } from "../_shared/email-delivery.ts";

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
        const emailResponse = await sendManagedEmail({
          admin: supabase,
          templateKey: "contact_notification",
          emailType: "operational",
          to: recipient.email,
          recipientName: recipient.name,
          contextType: "contact_message",
          contextId: messageData.id,
          variables: { name, email, phone: phone || "", subject, message },
          metadata: { source: "contact_form", recipient_role: "admin" },
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
      await sendManagedEmail({
        admin: supabase,
        templateKey: "contact_confirmation",
        emailType: "transactional",
        to: email,
        recipientName: name,
        contextType: "contact_message",
        contextId: messageData.id,
        variables: { name, subject, message },
        metadata: { source: "contact_form", recipient_role: "sender" },
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
