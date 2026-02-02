import { useState } from "react";
import { Send, Bot } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card } from "@/app/components/ui/card";
import { ScrollArea } from "@/app/components/ui/scroll-area";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  "What is this document about?",
  "Summarize the key points",
  "What are the main conclusions?",
];

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm analyzing your documents to provide an answer. This is a demo response.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-full">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="flex items-center justify-center">
            <img
              src="https://www.zohowebstatic.com/sites/zweb/images/commonroot/zoho-logo-web.svg"
              alt="Zoho"
              className="w-48 md:w-64 h-auto"
            />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">
              AI Assistant
            </h2>
            <p className="text-muted-foreground">
              Ask me anything on Zoho!
            </p>
          </div>
          <div className="space-y-3 w-full max-w-md">
            <p className="text-sm text-muted-foreground text-center">
              Try asking:
            </p>
            {suggestedQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3 px-4"
                onClick={() => handleSuggestionClick(question)}
              >
                <span className="italic text-muted-foreground">
                  {question}
                </span>
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 p-4 md:p-6">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <Card
                  className={`p-4 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </Card>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="border-t bg-background p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question about your documents..."
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={!input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}