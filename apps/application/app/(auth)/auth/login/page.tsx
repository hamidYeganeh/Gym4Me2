import PasswordView from "@/features/auth/PasswordView";
import messages from "@repo/i18n/messages/fa";

export const metadata = { title: messages.Application.signIn };

const Page = () => {
  return <PasswordView mode="login" />;
};

export default Page;
