import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import PostListPage from "./pages/PostListPage.jsx";
import PostCreatePage from "./pages/PostCreatePage.jsx";
import PostDetailPage from "./pages/PostDetailPage.jsx";
import PostModifyPage from "./pages/PostModifyPage.jsx";
import InfoModifyPage from "./pages/InfoModifyPage.jsx";
import PwModifyPage from "./pages/PwModifyPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/signup"
        element={<SignupPage />}
      />

      <Route
        path="/posts"
        element={<PostListPage />}
      />

      <Route
        path="/posts/create"
        element={<PostCreatePage />}
      />

      <Route
        path="/posts/:postId"
        element={<PostDetailPage />}
      />

      <Route
        path="/posts/:postId/modify"
        element={<PostModifyPage />}
      />

      <Route
        path="/modify-info"
        element={<InfoModifyPage />}
      />

      <Route
        path="/modify-password"
        element={<PwModifyPage />}
      />

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}
