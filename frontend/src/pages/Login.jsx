import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import api, { getApiErrorMessage } from '../lib/api';
import styles from './Login.module.css';

const Login = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setMessage(t('login.success'));
    } catch (error) {
      setMessage(getApiErrorMessage(error, t('login.failure')));
    }
  };

  const isSuccess = message === t('login.success');

  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <div className={styles.formPanel}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <Link className={styles.formBrandLogo} to="/" aria-label={t('navbar.homeAria')}>
                <strong>Beauty Spot</strong>
                <span>{t('navbar.brandTagline')}</span>
              </Link>
              <h2 className={styles.formTitle}>{t('login.title')}</h2>
              <p className={styles.formSubtitle}>{t('login.subtitle')}</p>
            </div>

            {message ? (
              <div className={`${styles.notice} ${isSuccess ? styles.noticeSuccess : styles.noticeError}`}>
                {message}
              </div>
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label} htmlFor="login-email">
                {t('login.email')}
              </label>
              <div className={styles.inputShell}>
                <Mail className={styles.inputIcon} size={18} strokeWidth={2} />
                <input
                  id="login-email"
                  className={styles.input}
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className={styles.passwordHeader}>
                <label className={styles.label} htmlFor="login-password">
                  {t('login.password')}
                </label>
                <a
                  className={styles.secondaryLink}
                  href="mailto:support@beautyspot.com?subject=Beauty%20Spot%20Password%20Reset"
                >
                  {t('common.auth.forgotPassword')}
                </a>
              </div>

              <div className={styles.inputShell}>
                <LockKeyhole className={styles.inputIcon} size={18} strokeWidth={2} />
                <input
                  id="login-password"
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.visibilityButton}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>

              <button className={styles.submitButton} type="submit">
                <span>{t('login.submit')}</span>
                <ArrowRight size={18} strokeWidth={2.2} />
              </button>
            </form>

            <p className={styles.signupText}>
              {t('common.auth.newHere')}{' '}
              <Link className={styles.primaryLink} to="/register">
                {t('common.actions.createAccount')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
