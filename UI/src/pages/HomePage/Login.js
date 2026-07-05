import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Login({ updateLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role || "user");
        updateLogin(true);
        navigate("/chat");
      } else {
        console.error("Autentificarea a eșuat!");
      }
    } catch (error) {
      console.error("Eroare de rețea:", error);
    }
  };

  const handleSignUpClick = () => {
    updateLogin(false);
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  return (
    <div className="book__form">
      <form action="#" className="form">
        <div className="u-margin-bottom-medium">
          <h2 className="heading-secundary">Login</h2>
        </div>
        <div className="form__group">
          <input
            type="email"
            className="form__input"
            placeholder="Email Address"
            id="email"
            required
            value={email}
            onChange={handleEmailChange}
          />
          <label htmlFor="email" className="form__label">
            Email address
          </label>
        </div>

        <div className="form__group">
          <input
            type="password"
            className="form__input"
            placeholder="Password"
            id="password"
            required
            value={password}
            onChange={handlePasswordChange}
          />
          <label htmlFor="password" className="form__label">
            Password
          </label>
        </div>
        <div className="form__group">
          <button className="btn btn--green" onClick={handleLogin}>
            Login &rarr;
          </button>
        </div>
        <p className="form__register">
          If you are new, just
          <button className="form__link" onClick={handleSignUpClick}>
            sign up
          </button>
          !
        </p>
      </form>
    </div>
  );
}
