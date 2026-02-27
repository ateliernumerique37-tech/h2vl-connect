'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Admin } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AdminFormProps {
  initialData?: Admin;
  onSubmit: (data: Omit<Admin, 'id' | 'dateCreation'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AdminForm({ initialData, onSubmit, onCancel, isSubmitting }: AdminFormProps) {
  const [formData, setFormData] = useState({
    prenom: initialData?.prenom || '',
    nom: initialData?.nom || '',
    email: initialData?.email || '',
    role: (initialData?.role || 'Administrateur') as Admin['role'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom</Label>
          <Input
            id="prenom"
            value={formData.prenom}
            onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
            placeholder="Ex: Jean"
            required
            aria-required="true"
            maxLength={50}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nom">Nom</Label>
          <Input
            id="nom"
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            placeholder="Ex: Dupont"
            required
            aria-required="true"
            maxLength={50}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="jean.dupont@example.com"
          required
          aria-required="true"
          disabled={!!initialData}
          maxLength={255}
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rôle</Label>
        <Select
          value={formData.role}
          onValueChange={(value: Admin['role']) => setFormData({ ...formData, role: value })}
        >
          <SelectTrigger id="role" aria-label="Sélectionner un rôle" className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <SelectValue placeholder="Choisir un rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Administrateur">Administrateur</SelectItem>
            <SelectItem value="Super Admin">Super Admin</SelectItem>
            <SelectItem value="Éditeur">Éditeur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Enregistrer les modifications" : "Créer le compte"}
        </Button>
      </div>
    </form>
  );
}
