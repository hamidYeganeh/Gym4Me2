import PasswordView from "@/features/auth/PasswordView";
import messages from "@repo/i18n/messages/fa";

export const metadata = { title: messages.Application.forgotYourPassword };

const Page = () => {
  return <PasswordView mode="forgot-password" />;
};

export default Page;
