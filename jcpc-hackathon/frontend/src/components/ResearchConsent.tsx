/**
 * Research Consent Component
 * IRB-compliant consent form for research participation
 */

import React, { useState, useEffect } from 'react';
import './ResearchConsent.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ConsentData {
  consentGiven: boolean;
  canUseForResearch: boolean;
  canShareAnonymized: boolean;
  consentDate?: string;
}

interface ResearchConsentProps {
  userId: number;
  onConsentComplete?: (consented: boolean) => void;
  requireConsent?: boolean; // If true, blocks usage until consent given
}

export function ResearchConsent({ userId, onConsentComplete, requireConsent = false }: ResearchConsentProps) {
  const [consent, setConsent] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    consentGiven: false,
    canUseForResearch: false,
    canShareAnonymized: false
  });

  // Check existing consent on mount
  useEffect(() => {
    checkExistingConsent();
  }, [userId]);

  const checkExistingConsent = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/behavioral/consent/${userId}`);
      const data = await response.json();

      if (data.hasConsent) {
        setConsent(data.consent);
        if (data.consent.consent_given) {
          onConsentComplete?.(true);
        } else if (requireConsent) {
          setShowModal(true);
        }
      } else if (requireConsent) {
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error checking consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitConsent = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/api/behavioral/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to submit consent');

      const data = await response.json();
      setConsent(data.consent);
      setShowModal(false);
      onConsentComplete?.(formData.consentGiven);
    } catch (error) {
      console.error('Error submitting consent:', error);
      alert('Failed to submit consent. Please try again.');
    }
  };

  const handleDeclineConsent = async () => {
    try {
      await fetch(`${API_BASE}/api/behavioral/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          consentGiven: false,
          canUseForResearch: false,
          canShareAnonymized: false
        })
      });

      setShowModal(false);
      onConsentComplete?.(false);
    } catch (error) {
      console.error('Error declining consent:', error);
    }
  };

  if (loading) {
    return <div className="research-consent-loading">Loading consent status...</div>;
  }

  if (!showModal && consent?.consent_given) {
    return null; // Don't show anything if already consented
  }

  return (
    <>
      {!consent && (
        <button
          className="research-consent-button"
          onClick={() => setShowModal(true)}
        >
          Research Participation
        </button>
      )}

      {showModal && (
        <div className="research-consent-modal">
          <div className="research-consent-modal-content">
            <h2>Research Study: Progressive Scaffolding Framework</h2>

            <div className="research-consent-text">
              <h3>Purpose of the Study</h3>
              <p>
                This study investigates how AI-assisted learning tools affect student problem-solving
                skills in competitive programming. We aim to understand optimal AI scaffolding
                strategies that promote learning while preventing over-dependence.
              </p>

              <h3>What We Collect</h3>
              <ul>
                <li>Your problem-solving attempts and solutions</li>
                <li>AI assistance requests and interactions</li>
                <li>Behavioral data (copy-paste events, tab switches, time spent)</li>
                <li>Reflection responses and self-assessments</li>
                <li>Code submissions and plagiarism checks</li>
              </ul>

              <h3>How We Use Your Data</h3>
              <ul>
                <li>Analyze learning patterns and AI dependency trends</li>
                <li>Improve AI tutoring strategies</li>
                <li>Publish findings in academic research papers</li>
                <li>All published data will be anonymized</li>
              </ul>

              <h3>Your Rights</h3>
              <ul>
                <li>Participation is completely voluntary</li>
                <li>You can withdraw consent at any time</li>
                <li>Declining will not affect your access to the platform</li>
                <li>Your data will be stored securely and used only for research</li>
                <li>You can request deletion of your data at any time</li>
              </ul>

              <h3>Contact Information</h3>
              <p>
                If you have questions about this study, please contact:<br />
                <strong>Principal Investigator</strong>: Dr. Research Lead<br />
                <strong>Email</strong>: research@university.edu<br />
                <strong>IRB Protocol</strong>: PSF-2024-001
              </p>
            </div>

            <form onSubmit={handleSubmitConsent} className="research-consent-form">
              <div className="consent-checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.consentGiven}
                    onChange={(e) => setFormData({
                      ...formData,
                      consentGiven: e.target.checked,
                      canUseForResearch: e.target.checked,
                      canShareAnonymized: e.target.checked
                    })}
                    required={requireConsent}
                  />
                  <strong>I consent to participate in this research study</strong>
                </label>

                {formData.consentGiven && (
                  <>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.canUseForResearch}
                        onChange={(e) => setFormData({
                          ...formData,
                          canUseForResearch: e.target.checked
                        })}
                      />
                      I allow my data to be used for research purposes
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={formData.canShareAnonymized}
                        onChange={(e) => setFormData({
                          ...formData,
                          canShareAnonymized: e.target.checked
                        })}
                      />
                      I allow anonymized data to be shared in publications
                    </label>
                  </>
                )}
              </div>

              <div className="research-consent-actions">
                <button
                  type="button"
                  onClick={handleDeclineConsent}
                  className="btn-decline"
                >
                  Decline
                </button>
                <button
                  type="submit"
                  className="btn-consent"
                  disabled={!formData.consentGiven}
                >
                  I Consent
                </button>
              </div>
            </form>

            <p className="consent-disclaimer">
              By clicking "I Consent", you acknowledge that you have read and understood
              the information above and agree to participate in this research study.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
