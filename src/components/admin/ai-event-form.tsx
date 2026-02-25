'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { generateDescription, type GenerateDescriptionState } from '@/actions/generate-description';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy } from 'lucide-react';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Générer la description
    </Button>
  );
}

export default function AiEventForm() {
  const initialState: GenerateDescriptionState = { message: '', errors: {} };
  const [state, dispatch] = useFormState(generateDescription, initialState);
  const [description, setDescription] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message === 'Success' && state.description) {
      setDescription(state.description);
      formRef.current?.reset();
    } else if (state.message && state.message !== 'Success') {
      toast({
        variant: "destructive",
        title: "Erreur de génération",
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleCopy = () => {
    navigator.clipboard.writeText(description).then(() => {
      toast({
        title: 'Copié !',
        description: 'La description a été copiée dans le presse-papiers.',
      });
    });
  };

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Générateur de description d'événement</CardTitle>
          <CardDescription>
            Entrez un titre et des mots-clés pour générer une description attrayante pour votre événement.
          </CardDescription>
        </CardHeader>
        <form action={dispatch} ref={formRef}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l'événement</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex: Atelier de poterie"
              />
              {state.errors?.title && (
                <p className="text-sm font-medium text-destructive">{state.errors.title[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Mots-clés (séparés par des virgules)</Label>
              <Input
                id="keywords"
                name="keywords"
                placeholder="Ex: créativité, argile, débutants"
              />
               {state.errors?.keywords && (
                <p className="text-sm font-medium text-destructive">{state.errors.keywords[0]}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Description générée</CardTitle>
          <CardDescription>
            Voici la description générée par l'IA. Vous pouvez la copier et la modifier.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="La description de votre événement apparaîtra ici..."
            rows={10}
            className="pr-12"
          />
          {description && (
             <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="absolute right-5 top-5"
                aria-label="Copier la description"
              >
                <Copy className="h-4 w-4" />
              </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
