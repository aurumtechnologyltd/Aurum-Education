import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Sparkles, MessageSquare, Calendar, FileText, Target, ArrowRight, Linkedin, Twitter, Instagram } from 'lucide-react'

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Aurum Education" className="w-8 h-8" />
              <span className="font-bold text-xl">Aurum Education</span>
            </Link>
            <div className="flex gap-4">
              <Link to="/pricing">
                <Button variant="ghost">Pricing</Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-[#D4AF37] hover:bg-[#D4AF37]/90">Start Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Powerful Features for
            <br />
            <span className="text-[#D4AF37]">Academic Success</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Everything you need to organize your semester and excel in your studies
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Core Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Upload Syllabus</h3>
                <p className="text-muted-foreground">
                  Simply upload your course syllabus and let AI extract all assignments, deadlines, and important information automatically.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Study Plan</h3>
                <p className="text-muted-foreground">
                  Get personalized, hour-by-hour study plans tailored to your schedule, priorities, and learning style.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Chat Your Questions</h3>
                <p className="text-muted-foreground">
                  Ask questions about your syllabus and course materials. Get instant, accurate answers powered by AI.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">More Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Calendar Integration</h3>
              <p className="text-muted-foreground">
                Sync your assignments and study sessions with Google Calendar. Never miss a deadline again.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Document Management</h3>
              <p className="text-muted-foreground">
                Upload and organize course documents. AI extracts key information automatically.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Assignment Tracking</h3>
              <p className="text-muted-foreground">
                Track all your assignments, exams, and projects in one place. Monitor your progress and grades.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-emerald-500 to-[#D4AF37] py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center text-white">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of students who have transformed their semester planning with Aurum Education.
            </p>
            <Link to="/signup">
              <Button size="lg" variant="secondary">
                Start Free
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Aurum Education" className="w-8 h-8" />
                <span className="font-bold">Aurum Education</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered semester planning made simple.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link></li>
                <li><Link to="/features" className="text-muted-foreground hover:text-foreground">Features</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://aurumtechnologyltd.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Aurum Technology Limited
                    <span className="text-xs ml-1">(Parent Company)</span>
                  </a>
                </li>
                <li><Link to="/about" className="text-muted-foreground hover:text-foreground">About</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Social</h3>
              <div className="flex gap-4">
                <a
                  href="https://www.linkedin.com/company/aururm-technology-limited"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
                <a
                  href="https://x.com/aurumtechnology"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (Twitter)"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://www.instagram.com/aurumtechnologyltd/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2025 Aurum Education. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

