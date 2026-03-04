"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { messagesService, usersService } from "@/services/api";
import type { Message, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Mail, Plus, Inbox, Send, Loader2, ArrowLeft, Clock } from "lucide-react";

export default function StudentMessagesPage() {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [composeOpen, setComposeOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

    const [faculty, setFaculty] = useState<User[]>([]);
    const [receiver, setReceiver] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

    async function fetchMessages() {
        setLoading(true);
        try { const { data } = await messagesService.list(); setMessages(data.results ?? []); }
        catch { toast.error("Failed to load messages"); }
        finally { setLoading(false); }
    }

    useEffect(() => { fetchMessages(); }, []);

    useEffect(() => {
        if (!composeOpen) return;
        usersService.list({ role: "faculty" }).then(({ data }) => setFaculty(data.results ?? [])).catch(() => { });
    }, [composeOpen]);

    const inbox = useMemo(() => messages.filter((m) => m.receiver === user?.id), [messages, user]);
    const sent = useMemo(() => messages.filter((m) => m.sender === user?.id), [messages, user]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!receiver || !body.trim()) { toast.error("Fill all required fields"); return; }
        setSending(true);
        try { await messagesService.send({ receiver, subject, body }); toast.success("Sent!"); setComposeOpen(false); setReceiver(""); setSubject(""); setBody(""); fetchMessages(); }
        catch { toast.error("Failed to send"); }
        finally { setSending(false); }
    }

    async function openMessage(msg: Message) {
        try { const { data } = await messagesService.get(msg.id); setSelectedMessage(data); fetchMessages(); }
        catch { setSelectedMessage(msg); }
    }

    if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-[400px]" /></div>;

    if (selectedMessage) {
        const m = selectedMessage;
        const isIncoming = m.receiver === user?.id;
        return (
            <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedMessage(null)} className="gap-1.5 -ml-2 text-xs">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                <div className="space-y-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">{m.subject || "(No Subject)"}</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">{isIncoming ? `From: ${m.sender_name}` : `To: ${m.receiver_name}`}</p>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div className="border-t pt-4"><p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p></div>
                    {isIncoming && (
                        <Button size="sm" onClick={() => { setReceiver(m.sender); setSubject(m.subject?.startsWith("Re: ") ? m.subject : `Re: ${m.subject}`); setBody(""); setSelectedMessage(null); setComposeOpen(true); }}>
                            <Send className="h-3.5 w-3.5 mr-1.5" /> Reply
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    const MessageList = ({ items, emptyText }: { items: Message[]; emptyText: string }) => (
        items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground"><Mail className="h-8 w-8 mx-auto mb-2 opacity-40" /><p>{emptyText}</p></div>
        ) : (
            <div className="space-y-0.5">
                {items.map((m) => {
                    const isIncoming = m.receiver === user?.id;
                    return (
                        <div key={m.id} onClick={() => openMessage(m)}
                            className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent/30 ${!m.is_read && isIncoming ? "bg-accent/20" : ""}`}
                            style={{ borderRadius: "var(--radius)" }}
                        >
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${!m.is_read && isIncoming ? "bg-primary/10" : "bg-muted"}`} style={{ borderRadius: "9999px" }}>
                                <Mail className="h-3.5 w-3.5" style={{ color: !m.is_read && isIncoming ? "var(--primary)" : "var(--muted-foreground)" }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className={`text-sm ${!m.is_read && isIncoming ? "font-semibold" : "font-medium"}`}>{isIncoming ? m.sender_name : m.receiver_name}</p>
                                    {!m.is_read && isIncoming && <Badge variant="default" className="h-4 text-[10px] px-1.5">New</Badge>}
                                </div>
                                <p className="text-sm truncate">{m.subject || "(No Subject)"}</p>
                                <p className="text-xs text-muted-foreground truncate">{m.body}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                    );
                })}
            </div>
        )
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
                    <p className="text-sm text-muted-foreground">Conversations with faculty</p>
                </div>
                <Button size="sm" onClick={() => setComposeOpen(true)} style={{ borderRadius: "var(--radius)" }}><Plus className="h-3.5 w-3.5 mr-1.5" /> Compose</Button>
            </div>

            <Tabs defaultValue="inbox">
                <TabsList>
                    <TabsTrigger value="inbox"><Inbox className="h-4 w-4 mr-1" /> Inbox ({inbox.filter(m => !m.is_read).length})</TabsTrigger>
                    <TabsTrigger value="sent"><Send className="h-4 w-4 mr-1" /> Sent</TabsTrigger>
                </TabsList>
                <TabsContent value="inbox" className="mt-3"><MessageList items={inbox} emptyText="No messages received." /></TabsContent>
                <TabsContent value="sent" className="mt-3"><MessageList items={sent} emptyText="No messages sent." /></TabsContent>
            </Tabs>

            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div className="space-y-2">
                            <Label>To (Faculty)</Label>
                            <Select value={receiver} onValueChange={setReceiver}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{faculty.map((f) => <SelectItem key={f.id} value={f.id}>{f.first_name} {f.last_name} · {f.email}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" /></div>
                        <div className="space-y-2"><Label>Message</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write..." rows={5} required /></div>
                        <DialogFooter><Button type="submit" disabled={sending}>{sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<Send className="h-4 w-4 mr-2" /> Send</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
