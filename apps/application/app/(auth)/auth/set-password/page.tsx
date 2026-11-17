import PasswordView from "@/features/auth/PasswordView";
import messages from "@repo/i18n/messages/fa";

export const metadata = { title: messages.Application.setANewPassword };

const Page = () => {
  return <PasswordView mode="set-password" />;
};

export default Page;
