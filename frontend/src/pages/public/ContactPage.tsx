import { useState } from "react";
import { Clock, Mail, MapPin, MessageSquare, Phone, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useSiteConfig } from "@/hooks/useApi";

/**
 * Contact page. The form composes an email in the visitor's own mail client
 * (there is no server-side contact endpoint, so nothing pretends to be sent).
 */
export function ContactPage() {
  const { data: config } = useSiteConfig();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const supportEmail = config?.support_email ?? "support@pai.example.com";

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`PAI enquiry from ${name || "a visitor"}`);
    const body = encodeURIComponent(`${message}\n\n— ${name}\n${email}`);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="container py-10 lg:py-14">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Contact us</h1>
        <p className="mt-2 text-muted-foreground">
          Questions about a course, payments or teaching on PAI? We're here to help.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-lg font-semibold">Get in touch</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <a href={`mailto:${supportEmail}`} className="text-muted-foreground hover:text-primary">
                    {supportEmail}
                  </a>
                </div>
              </li>
              {config?.contact_phone && (
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="font-medium text-foreground">Phone</p>
                    <p className="text-muted-foreground">{config.contact_phone}</p>
                  </div>
                </li>
              )}
              {config?.contact_address && (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="font-medium text-foreground">Address</p>
                    <p className="text-muted-foreground">{config.contact_address}</p>
                  </div>
                </li>
              )}
              <li className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">Support hours</p>
                  <p className="text-muted-foreground">Monday–Friday, 9am–6pm</p>
                </div>
              </li>
            </ul>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
            Send us a message
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This opens your email client with a pre-filled message — nothing is stored on our servers.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Your name</Label>
                <Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Your email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                required
              />
            </div>
            <Button type="submit">
              <Send />
              Compose email
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
