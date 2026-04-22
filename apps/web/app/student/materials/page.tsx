'use client';

import { motion, StaggerList, StaggerItem } from '@/components/motion';
import { BookOpen, FileText, Video, Link2, Presentation, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Material {
  id: string; subject_id: string; title: string; description: string | null;
  material_type: string; url: string; topic: string | null; created_at: string;
}

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  notes: { icon: FileText, color: 'text-primary bg-primary/10' },
  ppt: { icon: Presentation, color: 'text-warning bg-warning/10' },
  pdf: { icon: FileText, color: 'text-destructive bg-destructive/10' },
  video: { icon: Video, color: 'text-info bg-info/10' },
  drive_link: { icon: Link2, color: 'text-success bg-success/10' },
  assignment: { icon: BookOpen, color: 'text-warning bg-warning/10' },
  reference: { icon: Link2, color: 'text-muted-foreground bg-muted' },
  other: { icon: FileText, color: 'text-muted-foreground bg-muted' },
};

export default function StudentMaterialsPage() {
  const { data: materials, isLoading } = useQuery({
    queryKey: ['student', 'materials'],
    queryFn: () => api.get<Material[]>('/students/me/materials'),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const items = materials ?? [];

  // Group by topic
  const byTopic: Record<string, Material[]> = {};
  for (const m of items) {
    const topic = m.topic ?? 'General';
    if (!byTopic[topic]) byTopic[topic] = [];
    byTopic[topic]!.push(m);
  }

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold tracking-tight">
        <BookOpen className="mr-2 inline-block h-6 w-6 text-primary" />
        Study Materials
      </motion.h1>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-lg font-medium text-muted-foreground">No materials uploaded yet</p>
          <p className="text-sm text-muted-foreground/70">Your faculty will share notes, PPTs and links here</p>
        </div>
      ) : (
        Object.entries(byTopic).map(([topic, mats]) => (
          <div key={topic}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{topic}</h2>
            <StaggerList className="space-y-2">
              {mats.map((mat) => {
                const config = typeIcons[mat.material_type] ?? typeIcons.other!;
                const Icon = config.icon;
                return (
                  <StaggerItem key={mat.id}>
                    <a href={mat.url} target="_blank" rel="noreferrer" className="group">
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md">
                        <div className={cn('shrink-0 rounded-lg p-2.5', config.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium group-hover:text-primary transition-colors">{mat.title}</p>
                          {mat.description && <p className="text-sm text-muted-foreground truncate">{mat.description}</p>}
                          <p className="mt-1 text-xs text-muted-foreground capitalize">{mat.material_type.replace('_', ' ')} · {new Date(mat.created_at).toLocaleDateString()}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </a>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          </div>
        ))
      )}
    </div>
  );
}
