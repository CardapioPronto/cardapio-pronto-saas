import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmailOperationsPanel } from "@/components/email/EmailOperationsPanel";
import { Button } from "@/components/ui/button";

const EmailIntegracao = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="Integração de Email">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-md border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Email - Resend</h1>
            <p className="text-sm text-muted-foreground">
              Configure envio, templates, logs e campanhas automáticas no mesmo lugar.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(1)}>
              Avançar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        <EmailOperationsPanel scope="restaurant" />
      </div>
    </DashboardLayout>
  );
};

export default EmailIntegracao;
