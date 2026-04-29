import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import api, { getApiErrorMessage } from '../lib/api';
import styles from './Register.module.css';

const Register = () => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { name, email, password });
      setMessage(t('register.success'));
    } catch (error) {
      setMessage(getApiErrorMessage(error, t('register.failure')));
    }
  };

  const isSuccess = message === t('register.success');

  return (
    <section className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.brandPanel}>
          <div className={styles.brandTop}>
            <div className={styles.brandMark}>BS</div>
            <span className={styles.brandName}>Beauty Spot</span>
          </div>

          <div className={styles.brandContent}>
            <div className={styles.kicker}>
              <Sparkles size={16} strokeWidth={2.2} />
              <span>{t('register.kicker')}</span>
            </div>

            <h1 className={styles.title}>{t('register.title')}</h1>
            <p className={styles.description}>{t('register.description')}</p>
          </div>

          <div className={styles.brandHighlights}>
            <div className={styles.highlightCard}>
              <strong>{t('register.highlight1Title')}</strong>
              <span>{t('register.highlight1Text')}</span>
            </div>
            <div className={styles.highlightCard}>
              <strong>{t('register.highlight2Title')}</strong>
              <span>{t('register.highlight2Text')}</span>
            </div>
          </div>
        </aside>

        <div className={styles.formShell}>
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <div className={styles.formLogo}>Beauty Spot</div>
              <h2 className={styles.formTitle}>{t('register.formTitle')}</h2>
              <p className={styles.formSubtitle}>{t('register.formSubtitle')}</p>
            </div>

            {message ? (
              <div className={`${styles.notice} ${isSuccess ? styles.noticeSuccess : styles.noticeError}`}>
                {message}
              </div>
            ) : null}

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label} htmlFor="register-name">
                {t('register.name')}
              </label>
              <div className={styles.inputShell}>
                <UserRound className={styles.inputIcon} size={18} strokeWidth={2} />
                <input
                  id="register-name"
                  className={styles.input}
                  type="text"
                  placeholder={t('register.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <label className={styles.label} htmlFor="register-email">
                {t('register.email')}
              </label>
              <div className={styles.inputShell}>
                <Mail className={styles.inputIcon} size={18} strokeWidth={2} />
                <input
                  id="register-email"
                  className={styles.input}
                  type="email"
                  placeholder={t('register.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <label className={styles.label} htmlFor="register-password">
                {t('register.password')}
              </label>
              <div className={styles.inputShell}>
                <LockKeyhole className={styles.inputIcon} size={18} strokeWidth={2} />
                <input
                  id="register-password"
                  className={styles.input}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('register.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.visibilityButton}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>

              <button className={styles.submitButton} type="submit">
                <span>{t('register.submit')}</span>
                <ArrowRight size={18} strokeWidth={2.2} />
              </button>
            </form>

            <p className={styles.footerText}>
              {t('common.auth.alreadyHaveAccount')}{' '}
              <Link className={styles.footerLink} to="/login">
                {t('common.actions.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Register;
