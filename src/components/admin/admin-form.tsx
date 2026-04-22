'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Admin } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AdminFormProps {
  initialData?: Admin;
  onSubmit: (data: Omit<Admin, 'id' | 'dateCreation'> & { password?: string }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AdminForm({ initialData, onSubmit, onCancel, isSubmitting }: AdminFormProps) {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    prenom: initialData?.prenom || '',
    nom: initialData?.nom || '',
    email: initialData?.email || '',
    role: (initialData?.role || 'Administrateur') as Admin['role'],
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const { password, ...rest } = formData;
    await onSubmit(isEditing ? { ...rest, ...(password ? { password } : {}) } : { ...rest, password });
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
          disabled={isEditing}
          maxLength={255}
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">
          {isEditing ? 'Nouveau mot de passe' : 'Mot de passe initial'}
          {isEditing && <span className="ml-2 font-normal text-muted-foreground text-xs">(laisser vide pour ne pas modifier)</span>}
        </Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Minimum 6 caractères"
          required={!isEditing}
          aria-required={!isEditing}
          minLength={6}
          maxLength={100}
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          {isEditing
            ? "Le nouvel mot de passe sera appliqué immédiatement sur le compte Firebase."
            : "Communiquez ce mot de passe à l'administrateur. Il pourra le modifier depuis son profil."}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Rôle</Label>
        <RadioGroup
          value={formData.role}
          onValueChange={(value: Admin['role']) => setFormData({ ...formData, role: value })}
          className="grid grid-cols-2 gap-2"
        >
          {([
            { value: 'Administrateur', description: 'Accès complet' },
            { value: 'Modérateur', description: 'Sans accès adhérents' },
          ] as const).map(({ value, description }) => (
            <div key={value} className="flex items-center gap-2 rounded-md border bg-background p-3 hover:bg-muted/50 cursor-pointer transition-colors">
              <RadioGroupItem value={value} id={`role-${value}`} />
              <div>
                <Label htmlFor={`role-${value}`} className="cursor-pointer font-medium">{value}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting} className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Enregistrer les modifications" : "Créer le compte"}
        </Button>
      </div>
    </form>
  );
}
