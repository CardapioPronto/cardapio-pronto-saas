
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase'; 

const CreateInitialAdmin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<any>(null);
  
  const createAdmin = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setDebug(null);
    
    try {
      console.log("Starting create-initial-admin request");
      const { data: session } = await supabase.auth.getSession();
      
      const accessToken = session?.session?.access_token;
      console.log("Auth session:", !!accessToken ? "Token available" : "No token");
      
      const response = await fetch(
        'https://jyrfjvyeikhqpuwcvdff.supabase.co/functions/v1/create-initial-admin',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': accessToken ? `Bearer ${accessToken}` : ''
          }
        }
      );
      
      const data = await response.json();
      console.log("Edge function response:", response.status, data);
      
      if (response.ok) {
        setResult({ success: true, message: data.message || 'Super Admin criado com sucesso!' });
        setDebug(data.user || null);
      } else {
        setError(data.error || 'Erro ao criar admin inicial');
        setDebug({ status: response.status, ...data });
      }
    } catch (err) {
      console.error("Error in createAdmin:", err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setDebug({ errorType: typeof err, error: err });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Criar Super Admin Inicial</CardTitle>
          <CardDescription>
            Esta ferramenta criará o Super Admin inicial com as seguintes credenciais:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="font-semibold">E-mail:</div>
            <div className="col-span-2">juniorfalcao.jc@gmail.com</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="font-semibold">Senha:</div>
            <div className="col-span-2">jrfalcao@123456</div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="font-semibold">Função:</div>
            <div className="col-span-2">Super Admin</div>
          </div>
          
          {result && (
            <Alert className="bg-green-50 border-green-500">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Sucesso</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
              {debug && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                  <p className="font-semibold">ID do usuário: {debug.id}</p>
                  <p>E-mail: {debug.email}</p>
                </div>
              )}
            </Alert>
          )}
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              {debug && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-40">
                  <pre>{JSON.stringify(debug, null, 2)}</pre>
                </div>
              )}
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={createAdmin} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Criar Super Admin'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CreateInitialAdmin;
