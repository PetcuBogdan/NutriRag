/* eslint-disable jsx-a11y/anchor-is-valid */
import Logo from "../../img/chatbot.png";

export default function Headers() {
  return (
    <header className="header">
      <div className="header__logo-box">
        <img src={Logo} alt="Logo" className="header__logo" />
      </div>
      <div className="header__text-box">
        <h1 className="heading-primary">
          <span className="heading-primary--main">NUTRIRAG</span>
          <span className="heading-primary--sub">
            ASISTENT INTELIGENT DE NUTRIȚIE
          </span>
        </h1>
        <a href="#" className="btn btn--white btn--animated">
          Descoperă funcționalitățile
        </a>
      </div>
    </header>
  );
}
