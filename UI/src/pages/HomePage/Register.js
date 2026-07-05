import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register({ updateLogin }) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isNutritionist, setIsNutritionist] = useState(false);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handlePasswordConfirmChange = (e) => {
    setPasswordConfirm(e.target.value);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/auth/signup", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, isNutritionist }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role || "user");
        updateLogin(true);
        navigate("/chat");
      } else {
        const errorData = await response.json();
        alert(`Registration failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred during registration");
    }
  };

  const handleSignUpClick = () => {
    updateLogin(true);
  };
  return (
    <div className="book__form">
      <form action="#" className="form">
        <div className="u-margin-bottom-small">
          <h2 className="heading-secundary">Register</h2>
        </div>
        <div className="form__group--register">
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

        <div className="form__group--register">
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

        <div className="form__group--register">
          <input
            type="password"
            className="form__input"
            placeholder="Confirm password"
            id="passwordConfirm"
            required
            value={passwordConfirm}
            onChange={handlePasswordConfirmChange}
          />
          <label htmlFor="passwordConfirm" className="form__label">
            Confirm Password
          </label>
        </div>
        <div className="form__group--register" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <input
            type="checkbox"
            id="isNutritionist"
            checked={isNutritionist}
            onChange={(e) => setIsNutritionist(e.target.checked)}
            style={{ width: '1.6rem', height: '1.6rem', cursor: 'pointer' }}
          />
          <label htmlFor="isNutritionist" style={{ cursor: 'pointer', fontWeight: 500 }}>
            Sunt nutriționist
          </label>
        </div>
        <div className="form__group">
          <button className="btn btn--green" onClick={handleRegister}>
            Register &rarr;
          </button>
        </div>
        <p className="form__register">
          If you have an account, you can
          <button className="form__link" onClick={handleSignUpClick}>
            log in
          </button>
          !
        </p>
      </form>
    </div>
  );
}
