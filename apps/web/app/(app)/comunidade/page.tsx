import { ComingSoon } from "@/components/layout/coming-soon";
import { Phone } from "lucide-react";

export default function Page() {
  return (
    <ComingSoon
      icon={Phone}
      eyebrow="Comunidade"
      title="Grupo no WhatsApp para gestores de tráfego usuários do Ad Manager."
      description="Espaço de troca, perguntas, casos reais e atualizações antecipadas de features. Em produção: link direto chat.whatsapp.com sem stop aqui."
      phase="Always — link externo"
      highlights={["Em produção este item da sidebar abre direto chat.whatsapp.com em nova aba"]}
    />
  );
}
