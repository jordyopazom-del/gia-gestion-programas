import re

with open("src/app/(app)/mujer/MujerClientView.tsx", "r") as f:
    content = f.read()

# 1. Add initialEmbarazadasData to props and type
content = content.replace("export default function MujerClientView({ initialData, user }: { initialData: PacienteMujer[], user: UserProfile }) {",
"export default function MujerClientView({ initialData, initialEmbarazadasData, user }: { initialData: PacienteMujer[], initialEmbarazadasData?: any[], user: UserProfile }) {")

# 2. Add embarazadasData state
content = content.replace("const [data, setData] = useState<PacienteMujer[]>(initialData);",
"const [data, setData] = useState<PacienteMujer[]>(initialData);\n  const [embarazadasData, setEmbarazadasData] = useState<any[]>(initialEmbarazadasData || []);")

# 3. Add activeTab 'embarazadas' and 'embarazo' form states
content = content.replace('const [activeTab, setActiveTab] = useState("general"); // "general" o "pap"',
'const [activeTab, setActiveTab] = useState("general"); // "general", "pap", "embarazadas"\n  const [tipoIngreso, setTipoIngreso] = useState("SELECCION"); // "SELECCION", "PAP", "EMBARAZO"')

content = content.replace('const [fechaResultadoForm, setFechaResultadoForm] = useState("");',
"""const [fechaResultadoForm, setFechaResultadoForm] = useState("");

  // Estados Formulario Embarazo
  const [fumForm, setFumForm] = useState("");
  const [fppForm, setFppForm] = useState("");
  const [fechaUltimoControlForm, setFechaUltimoControlForm] = useState("");
  const [fechaProximoControlForm, setFechaProximoControlForm] = useState("");
  const [estadoNutricionalForm, setEstadoNutricionalForm] = useState("");
  const [observacionesEmbarazoForm, setObservacionesEmbarazoForm] = useState("");
  
  // Auto-calcular FPP cuando cambia FUM
  const handleFumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fumDate = e.target.value;
    setFumForm(fumDate);
    if (fumDate) {
      const date = new Date(fumDate);
      date.setDate(date.getDate() + 280); // 40 semanas
      setFppForm(date.toISOString().split('T')[0]);
    } else {
      setFppForm("");
    }
  };

  const calcularSemanasGestacion = (fumStr: string) => {
    if(!fumStr) return "-";
    const fumDate = new Date(fumStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - fumDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return `${weeks}+${days}`;
  };
""")

with open("src/app/(app)/mujer/MujerClientView.tsx", "w") as f:
    f.write(content)
print("Paso 1 aplicado")
