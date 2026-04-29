import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';
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
        <div className={styles.showcase}>
          <div className={styles.brandRow}>
            <div className={styles.brandMark}>BS</div>
            <span className={styles.brandName}>Beauty Spot</span>
          </div>

          <div className={styles.copyBlock}>
            <div className={styles.kicker}>
              <Sparkles size={16} strokeWidth={2.1} />
              <span>{t('login.premiumAccess')}</span>
            </div>

            <h1 className={styles.title}>{t('login.title')}</h1>
            <p className={styles.subtitle}>{t('login.subtitle')}</p>
            <p className={styles.description}>{t('login.description')}</p>
            <p className={styles.reassurance}>{t('login.reassurance')}</p>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metricItem}>
              <strong>{t('login.metric1Title')}</strong>
              <span>{t('login.metric1Text')}</span>
            </div>
            <div className={styles.metricItem}>
              <strong>{t('login.metric2Title')}</strong>
              <span>{t('login.metric2Text')}</span>
            </div>
          </div>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <div className={styles.logo}>Beauty Spot</div>
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
