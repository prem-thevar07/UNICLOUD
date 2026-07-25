import Header from "../components/Header";
import GlobalTransferWidget from "../components/GlobalTransferWidget";

const MainLayout = ({ children }) => {
  return (
    <>
      <Header />
      <main>{children}</main>
      <GlobalTransferWidget />
    </>
  );
};

export default MainLayout;