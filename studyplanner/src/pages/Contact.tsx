import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2, AlertCircle, Linkedin, Twitter, Instagram } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface FormData {
  firstName: string
  lastName: string
  email: string
  company: string
  interest: string
  message: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  message?: string
}

export default function Contact() {
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    interest: 'product',
    message: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Capture UTM parameters from URL
  useEffect(() => {
    // UTM params are already in searchParams, we'll use them on submit
  }, [searchParams])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'firstName':
        return !value.trim() ? 'This field is required' : undefined
      case 'lastName':
        return !value.trim() ? 'This field is required' : undefined
      case 'email':
        if (!value.trim()) return 'Email is required'
        if (!validateEmail(value)) return 'Please enter a valid email address'
        return undefined
      case 'message':
        return !value.trim() ? 'Message is required' : undefined
      default:
        return undefined
    }
  }

  const handleBlur = (name: keyof FormData) => {
    const value = formData[name]
    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const handleChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    // Validate all fields
    const newErrors: FormErrors = {}
    newErrors.firstName = validateField('firstName', formData.firstName)
    newErrors.lastName = validateField('lastName', formData.lastName)
    newErrors.email = validateField('email', formData.email)
    newErrors.message = validateField('message', formData.message)

    if (newErrors.firstName || newErrors.lastName || newErrors.email || newErrors.message) {
      setErrors(newErrors)
      return
    }

    setStatus('loading')

    try {
      // Prepare data for Supabase
      const leadData = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        company: formData.company || null,
        interest: formData.interest,
        message: formData.message,
        utm_source: searchParams.get('utm_source') || null,
        utm_campaign: searchParams.get('utm_campaign') || null,
        utm_medium: searchParams.get('utm_medium') || null,
        utm_content: searchParams.get('utm_content') || null,
        page_url: window.location.href,
        status: 'New',
      }

      // Submit to Supabase with timeout
      const supabasePromise = supabase
        .from('leads')
        .insert([leadData])
        .select()

      const supabaseTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 12000)
      )

      await Promise.race([supabasePromise, supabaseTimeout])

      // Send to n8n webhook (non-blocking)
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_FORMS
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        }).catch(() => {
          // Silently fail - webhook is optional
        })
      }

      setStatus('success')
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        interest: 'product',
        message: '',
      })
      setErrors({})
    } catch (error: any) {
      // Handle duplicate entry gracefully
      if (error?.code === '23505' || error?.message?.includes('duplicate')) {
        setStatus('success') // Show success even if duplicate
      } else {
        setStatus('error')
        setErrorMessage(
          error?.message || 'Failed to send message. Please try again later.'
        )
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl animate-pulse" />

      {/* Header */}
      <header className="border-b border-slate-800 relative z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Aurum Education" className="w-8 h-8" />
              <span className="font-bold text-xl text-white">Aurum Education</span>
            </Link>
            <div className="flex gap-4">
              <Link to="/pricing">
                <Button variant="ghost" className="text-white hover:text-[#D4AF37]">
                  Pricing
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" className="text-white hover:text-[#D4AF37]">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white">
                  Start Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section id="contact" className="container mx-auto px-4 py-20 relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl lg:text-6xl mb-4 text-white tracking-tight">
            Let's Build the{' '}
            <span className="text-[#D4AF37]">Future</span> Together
          </h1>
          <p className="text-lg text-slate-400 mb-2">
            For partnerships, pilots, and media inquiries
          </p>
          <p className="text-lg text-slate-300 max-w-3xl mx-auto">
            Whether you're interested in our products, exploring partnership opportunities, or seeking investment information, we'd love to hear from you.
          </p>
        </motion.div>

        {/* Section Divider */}
        <div
          className="h-px w-full mb-16"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent)',
          }}
        />

        {/* Form and Contact Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-2xl text-white mb-6">Send us a Message</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* First Name */}
                <div className="form-group">
                  <input
                    type="text"
                    id="fname"
                    className={`form-input-float ${errors.firstName ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder=" "
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                  />
                  <label htmlFor="fname" className="form-label-float">
                    First Name <span className="text-red-400">*</span>
                  </label>
                  {errors.firstName && (
                    <p className="text-red-400 text-xs mt-1 ml-4">{errors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div className="form-group">
                  <input
                    type="text"
                    id="lname"
                    className={`form-input-float ${errors.lastName ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder=" "
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                  />
                  <label htmlFor="lname" className="form-label-float">
                    Last Name <span className="text-red-400">*</span>
                  </label>
                  {errors.lastName && (
                    <p className="text-red-400 text-xs mt-1 ml-4">{errors.lastName}</p>
                  )}
                </div>

                {/* Email */}
                <div className="form-group">
                  <input
                    type="email"
                    id="email"
                    className={`form-input-float ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder=" "
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                  />
                  <label htmlFor="email" className="form-label-float">
                    Email <span className="text-red-400">*</span>
                  </label>
                  {errors.email && (
                    <p className="text-red-400 text-xs mt-1 ml-4">{errors.email}</p>
                  )}
                </div>

                {/* Company */}
                <div className="form-group">
                  <input
                    type="text"
                    id="company"
                    className="form-input-float"
                    placeholder=" "
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                  />
                  <label htmlFor="company" className="form-label-float">
                    Company
                  </label>
                </div>

                {/* Interest */}
                <div className="form-group">
                  <div className="relative">
                    <Select
                      value={formData.interest}
                      onValueChange={(value) => handleChange('interest', value)}
                    >
                      <SelectTrigger className="form-input-float h-auto py-4 px-4 text-white [&>span]:text-white">
                        <SelectValue placeholder="Select interest" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="product">Product Interest</SelectItem>
                        <SelectItem value="Aurum Life">Aurum Life</SelectItem>
                        <SelectItem value="Aurum Automation">Aurum Automation</SelectItem>
                        <SelectItem value="Aurum Finance">Aurum Finance</SelectItem>
                        <SelectItem value="ComplyAI">ComplyAI</SelectItem>
                        <SelectItem value="Aurum Education">Aurum Education</SelectItem>
                        <SelectItem value="Partnership">Partnership</SelectItem>
                        <SelectItem value="Investment">Investment</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="form-label-float pointer-events-none">
                      Interest
                    </label>
                  </div>
                </div>

                {/* Message */}
                <div className="form-group">
                  <textarea
                    id="message"
                    rows={4}
                    className={`form-input-float resize-none ${errors.message ? 'border-red-500 focus:border-red-500' : ''}`}
                    placeholder=" "
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    onBlur={() => handleBlur('message')}
                  />
                  <label htmlFor="message" className="form-label-float">
                    Message <span className="text-red-400">*</span>
                  </label>
                  {errors.message && (
                    <p className="text-red-400 text-xs mt-1 ml-4">{errors.message}</p>
                  )}
                </div>

                {/* Success Message */}
                {status === 'success' && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-base">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">
                      <strong>Thank you!</strong> We've received your message and will get back to you within 24 hours.
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {status === 'error' && errorMessage && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-base">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{errorMessage}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="magnetic-btn w-full py-4 rounded-xl font-medium text-sm transition-all border-beam relative overflow-hidden group"
                  style={{
                    minHeight: '44px',
                    background:
                      status === 'success'
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'linear-gradient(135deg, #D4AF37, #B8860B)',
                    color: '#020617',
                  }}
                >
                  {status === 'loading' && (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 inline-block animate-spin" />
                      Sending Message...
                    </>
                  )}
                  {status === 'success' && (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 inline-block" />
                      Message Sent!
                    </>
                  )}
                  {status !== 'loading' && status !== 'success' && (
                    <>
                      <Send className="w-4 h-4 mr-2 inline-block" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-6"
          >
            <motion.a
              href="mailto:marc.alleyne@aurumtechnologyltd.com"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#D4AF37]/30 transition-all duration-300 backdrop-blur-sm cursor-pointer"
            >
              <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Email</p>
                <p className="text-white">marc.alleyne@aurumtechnologyltd.com</p>
              </div>
            </motion.a>

            <motion.a
              href="tel:+18684779318"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.7 }}
              className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#D4AF37]/30 transition-all duration-300 backdrop-blur-sm cursor-pointer"
            >
              <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Phone</p>
                <p className="text-white">(868) 477-9318</p>
              </div>
            </motion.a>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.8 }}
              className="flex items-center gap-4 p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm"
            >
              <div className="w-12 h-12 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">Location</p>
                <p className="text-white">Trinidad and Tobago</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 relative z-10">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Aurum Education" className="w-8 h-8" />
                <span className="font-bold text-white">Aurum Education</span>
              </div>
              <p className="text-sm text-slate-400">
                AI-powered semester planning made simple.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/pricing" className="text-slate-400 hover:text-[#D4AF37]">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link to="/features" className="text-slate-400 hover:text-[#D4AF37]">
                    Features
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://aurumtechnologyltd.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-[#D4AF37]"
                  >
                    Aurum Technology Limited
                    <span className="text-xs ml-1">(Parent Company)</span>
                  </a>
                </li>
                <li>
                  <Link to="/about" className="text-slate-400 hover:text-[#D4AF37]">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-slate-400 hover:text-[#D4AF37]">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4 text-white">Social</h3>
              <div className="flex gap-4">
                <a
                  href="https://www.linkedin.com/company/aururm-technology-limited"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-slate-400 hover:text-[#D4AF37] transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="https://x.com/aurumtechnology"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                  className="text-slate-400 hover:text-[#D4AF37] transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://www.instagram.com/aurumtechnologyltd/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-slate-400 hover:text-[#D4AF37] transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-400">
            © 2025 Aurum Education. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Floating Label Styles */}
      <style>{`
        .form-group {
          position: relative;
        }
        .form-input-float {
          width: 100%;
          padding: 1.5rem 1rem 0.5rem;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(212, 175, 55, 0.2);
          border-radius: 0.75rem;
          color: white;
          outline: none;
          transition: all 0.3s ease;
        }
        .form-input-float:focus {
          border-color: #D4AF37;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.1);
        }
        .form-label-float {
          position: absolute;
          left: 1rem;
          top: 1rem;
          color: #94a3b8;
          font-size: 0.875rem;
          pointer-events: none;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .form-input-float:focus ~ .form-label-float,
        .form-input-float:not(:placeholder-shown) ~ .form-label-float {
          top: 0.5rem;
          font-size: 0.7rem;
          color: #D4AF37;
        }
      `}</style>
    </div>
  )
}

