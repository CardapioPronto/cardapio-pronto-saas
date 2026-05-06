import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { EmailOperationsPanel } from "@/components/email/EmailOperationsPanel";

const EmailIntegracao = () => {
  return (
    <DashboardLayout title="Integração de Email">
      <EmailOperationsPanel scope="restaurant" />
    </DashboardLayout>
  );
};

export default EmailIntegracao;
