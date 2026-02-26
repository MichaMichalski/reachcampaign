"use client";

import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Save } from "lucide-react";

import grapesjs, { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import grapesjsNewsletter from "grapesjs-preset-newsletter";

type EmailEditorProps = {
  designJson?: object;
  onSave: (data: { designJson: object; html: string }) => void;
};

export function EmailEditor({ designJson, onSave }: EmailEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const projectData = editor.getProjectData();
    const html = editor.runCommand("gjs-get-inlined-html") as string;
    onSave({ designJson: projectData, html: html || "" });
  }, [onSave]);

  const setDevice = useCallback((device: string) => {
    editorRef.current?.setDevice(device);
  }, []);

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    const editor = grapesjs.init({
      container: containerRef.current,
      height: "100%",
      width: "auto",
      storageManager: false,
      plugins: [grapesjsNewsletter],
      pluginsOpts: {
        [grapesjsNewsletter as unknown as string]: {},
      },
      deviceManager: {
        devices: [
          { name: "Desktop", width: "" },
          { name: "Mobile", width: "375px", widthMedia: "480px" },
        ],
      },
      blockManager: {
        blocks: [
          {
            id: "text-block",
            label: "Text",
            category: "Basic",
            content:
              '<div style="padding: 10px;"><p>Insert your text here</p></div>',
          },
          {
            id: "image-block",
            label: "Image",
            category: "Basic",
            content: {
              type: "image",
              style: { width: "100%", "max-width": "600px" },
            },
          },
          {
            id: "button-block",
            label: "Button",
            category: "Basic",
            content:
              '<a href="#" style="display:inline-block;padding:12px 24px;background-color:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Click me</a>',
          },
          {
            id: "divider-block",
            label: "Divider",
            category: "Basic",
            content:
              '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />',
          },
          {
            id: "social-block",
            label: "Social Links",
            category: "Basic",
            content: `<div style="text-align:center;padding:20px;">
              <a href="#" style="display:inline-block;margin:0 8px;color:#64748b;text-decoration:none;font-size:14px;">Twitter</a>
              <a href="#" style="display:inline-block;margin:0 8px;color:#64748b;text-decoration:none;font-size:14px;">Facebook</a>
              <a href="#" style="display:inline-block;margin:0 8px;color:#64748b;text-decoration:none;font-size:14px;">LinkedIn</a>
            </div>`,
          },
          {
            id: "spacer-block",
            label: "Spacer",
            category: "Basic",
            content: '<div style="height:30px;"></div>',
          },
        ],
      },
    });

    if (designJson && Object.keys(designJson).length > 0) {
      editor.loadProjectData(designJson as ReturnType<Editor["getProjectData"]>);
    }

    editorRef.current = editor;

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDevice("Desktop")}
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDevice("Mobile")}
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </Button>
        </div>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
