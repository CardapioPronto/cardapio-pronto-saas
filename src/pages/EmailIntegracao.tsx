import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmailIntegrationForm } from "@/components/email/EmailIntegrationForm";

const EmailIntegracao = () => {
  return (
    <DashboardLayout title="Integração de Email">
      <EmailIntegrationForm scope="restaurant" />
    </DashboardLayout>
  );
};

export default EmailIntegracao;
