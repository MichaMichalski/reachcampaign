"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagSelector({ selectedTags, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    try {
      const res = await fetch("/api/v1/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data.data ?? data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  function toggleTag(tag: Tag) {
    const exists = selectedTags.some((t) => t.id === tag.id);
    if (exists) {
      onChange(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  }

  async function createTag() {
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const tag = data.data ?? data;
        setTags((prev) => [...prev, tag]);
        onChange([...selectedTags, tag]);
        setNewTagName("");
        setShowCreate(false);
      }
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-6 w-16 animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTags.some((t) => t.id === tag.id);
          return (
            <button key={tag.id} type="button" onClick={() => toggleTag(tag)}>
              <Badge
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                style={
                  isSelected
                    ? { backgroundColor: tag.color, borderColor: tag.color }
                    : { borderColor: tag.color, color: tag.color }
                }
              >
                {tag.name}
                {isSelected && <X className="ml-1 h-3 w-3" />}
              </Badge>
            </button>
          );
        })}
        {tags.length === 0 && !showCreate && (
          <p className="text-sm text-muted-foreground">No tags available.</p>
        )}
      </div>

      {showCreate ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="h-8 w-40"
            onKeyDown={(e) => e.key === "Enter" && createTag()}
          />
          <Button
            type="button"
            size="sm"
            onClick={createTag}
            disabled={creating || !newTagName.trim()}
          >
            Add
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setShowCreate(false);
              setNewTagName("");
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          New Tag
        </Button>
      )}
    </div>
  );
}
