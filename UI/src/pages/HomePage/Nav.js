import React, { useState } from "react";
import Login from "./Login";
import Register from "./Register";

function Nav() {
  const [login, setLogin] = useState(true);

  const updateLogin = (newValue) => {
    setLogin(newValue);
  };

  return (
    <div className="navigation">
      <input
        type="checkbox"
        className="navigation__checkbox"
        id="navi-toggle"
      />

      <label htmlFor="navi-toggle" className="navigation__button">
        <span className="navigation__icon"> &nbsp; </span>
      </label>

      <div className="navigation__background">&nbsp;</div>

      <nav className="navigation__nav">
        <section className="section-book">
          <div className="row">
            <div className="book">
              {login ? (
                <Login updateLogin={updateLogin} />
              ) : (
                <Register updateLogin={updateLogin} />
              )}
            </div>
          </div>
        </section>
      </nav>
    </div>
  );
}

export default Nav;
