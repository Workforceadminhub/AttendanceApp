import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SkeletonTheme } from "react-loading-skeleton";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NotFound from "./components/NotFound";
import Login from "./components/Login";
import Dashboard from "./components/Workers/Dashboard";
import Summary from "./components/Summary";

const App = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SkeletonTheme baseColor="#e5e5e5" highlightColor="#d6d4d4">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/summary" element={<Summary />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" exact={true} element={<NotFound />} />
          </Routes>
        </SkeletonTheme>
      </BrowserRouter>
      <ToastContainer
        hideProgressBar
        autoClose={5000}
        theme="colored"
        position="top-center"
      />
    </QueryClientProvider>
  );
};

export default App;
