import { AuthMethods } from "../../features/auth/index";

const Page = () => {
  return (
    <AuthMethods
      applicationUrl={
        process.env.NEXT_PUBLIC_CLUB_APPLICATION_URL ?? "http://localhost:3000/club-registration/"
      }
    />
  );
};

export default Page;
