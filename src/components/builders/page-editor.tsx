"use client";

import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Tablet, Smartphone, Save } from "lucide-react";

import grapesjs, { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import grapesjsWebpage from "grapesjs-preset-webpage";

type PageEditorProps = {
  designJson?: object;
  onSave: (data: { designJson: object; html: string }) => void;
};

export function PageEditor({ designJson, onSave }: PageEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSave = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const projectData = editor.getProjectData();
    const html = editor.getHtml();
    const css = editor.getCss();
    const fullHtml = css
      ? `<style>${css}</style>${html}`
      : html;
    onSave({ designJson: projectData, html: fullHtml || "" });
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
      plugins: [grapesjsWebpage],
      pluginsOpts: {
        [grapesjsWebpage as unknown as string]: {},
      },
      deviceManager: {
        devices: [
          { name: "Desktop", width: "" },
          { name: "Tablet", width: "768px", widthMedia: "992px" },
          { name: "Mobile", width: "375px", widthMedia: "480px" },
        ],
      },
      styleManager: {
        sectors: [
          {
            name: "General",
            properties: [
              "display",
              "float",
              "position",
              "top",
              "right",
              "left",
              "bottom",
            ],
          },
          {
            name: "Dimension",
            properties: [
              "width",
              "height",
              "max-width",
              "min-height",
              "margin",
              "padding",
            ],
          },
          {
            name: "Typography",
            properties: [
              "font-family",
              "font-size",
              "font-weight",
              "letter-spacing",
              "color",
              "line-height",
              "text-align",
              "text-decoration",
              "text-shadow",
            ],
          },
          {
            name: "Decorations",
            properties: [
              "background-color",
              "border-radius",
              "border",
              "box-shadow",
              "background",
            ],
          },
        ],
      },
      layerManager: { appendTo: ".layers-container" },
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
              style: { width: "100%", "max-width": "800px" },
            },
          },
          {
            id: "video-block",
            label: "Video",
            category: "Basic",
            content: {
              type: "video",
              src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
              style: { width: "100%", height: "315px" },
            },
          },
          {
            id: "columns-2",
            label: "2 Columns",
            category: "Layout",
            content: `<div style="display:flex;gap:20px;padding:10px;">
              <div style="flex:1;min-height:75px;padding:10px;border:1px dashed #ccc;">Column 1</div>
              <div style="flex:1;min-height:75px;padding:10px;border:1px dashed #ccc;">Column 2</div>
            </div>`,
          },
          {
            id: "columns-3",
            label: "3 Columns",
            category: "Layout",
            content: `<div style="display:flex;gap:20px;padding:10px;">
              <div style="flex:1;min-height:75px;padding:10px;border:1px dashed #ccc;">Column 1</div>
              <div style="flex:1;min-height:75px;padding:10px;border:1px dashed #ccc;">Column 2</div>
              <div style="flex:1;min-height:75px;padding:10px;border:1px dashed #ccc;">Column 3</div>
            </div>`,
          },
          {
            id: "hero-section",
            label: "Hero Section",
            category: "Sections",
            content: `<section style="padding:80px 20px;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;">
              <h1 style="font-size:48px;font-weight:700;margin-bottom:16px;">Your Headline Here</h1>
              <p style="font-size:20px;margin-bottom:32px;opacity:0.9;">A compelling subtitle that explains your value proposition</p>
              <a href="#" style="display:inline-block;padding:14px 32px;background:#fff;color:#764ba2;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Get Started</a>
            </section>`,
          },
          {
            id: "button-block",
            label: "Button",
            category: "Basic",
            content:
              '<a href="#" style="display:inline-block;padding:12px 24px;background-color:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">Click me</a>',
          },
          {
            id: "form-block",
            label: "Form",
            category: "Basic",
            content: `<form style="max-width:500px;margin:0 auto;padding:20px;">
              <div style="margin-bottom:16px;">
                <label style="display:block;margin-bottom:4px;font-weight:500;">Name</label>
                <input type="text" name="name" placeholder="Your name" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;" />
              </div>
              <div style="margin-bottom:16px;">
                <label style="display:block;margin-bottom:4px;font-weight:500;">Email</label>
                <input type="email" name="email" placeholder="Your email" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;" />
              </div>
              <button type="submit" style="padding:12px 24px;background:#4f46e5;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Submit</button>
            </form>`,
          },
          {
            id: "map-block",
            label: "Map",
            category: "Basic",
            content:
              '<iframe src="https://maps.google.com/maps?q=New+York&output=embed" style="width:100%;height:300px;border:0;" allowfullscreen loading="lazy"></iframe>',
          },
          {
            id: "list-block",
            label: "List",
            category: "Basic",
            content: `<ul style="padding:10px 10px 10px 30px;">
              <li style="margin-bottom:8px;">List item 1</li>
              <li style="margin-bottom:8px;">List item 2</li>
              <li style="margin-bottom:8px;">List item 3</li>
            </ul>`,
          },
        ],
      },
    });

    if (designJson && Object.keys(designJson).length > 0) {
      editor.loadProjectData(
        designJson as ReturnType<Editor["getProjectData"]>
      );
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
            onClick={() => setDevice("Tablet")}
          >
            <Tablet className="h-4 w-4" />
            Tablet
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
