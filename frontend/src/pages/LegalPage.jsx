import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaFileContract, FaUserShield } from 'react-icons/fa';

const CLUB = 'Club Atlético Argentinos del Norte';
const DOMICILIO = 'Av. Benjamín Aráoz 650, San Miguel de Tucumán, Tucumán, Argentina';
const EMAIL = 'contacto@argentinosdelnorte.com';
const ACTUALIZACION = '31 de octubre de 2026';

function Seccion({ titulo, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-headline text-xl uppercase tracking-wide text-[#151f89]">{titulo}</h2>
      <div className="space-y-3 font-body text-sm sm:text-base text-slate-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Lista({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

const Contacto = () => <a href={`mailto:${EMAIL}`} className="font-semibold text-[#151f89] hover:underline break-all">{EMAIL}</a>;

function Privacidad() {
  return (
    <>
      <Seccion titulo="1. Quién es responsable de tus datos">
        <p>
          El responsable de la base de datos es el {CLUB}, con domicilio en {DOMICILIO}. Por cualquier consulta sobre
          tus datos podés escribir a <Contacto />.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos tratamos">
        <p><strong>Jugadores y socios:</strong></p>
        <Lista items={[
          'Nombre, apellido, DNI, fecha de nacimiento, teléfono, correo electrónico y, si se carga, fotografía.',
          'Equipos y divisiones en los que participa, número de camiseta y posición.',
          'Partidos jugados, goles y tarjetas.',
          'Cuotas sociales: período, monto, fecha, método de pago y vencimiento.',
        ]} />
        <p><strong>Cuerpo técnico:</strong> nombre, apellido, DNI, teléfono, correo electrónico y función.</p>
        <p>
          <strong>Usuarios del panel de administración:</strong> nombre, correo electrónico, teléfono, rol y división
          asignada. Las contraseñas se guardan cifradas.
        </p>
        <p>
          <strong>Visitantes del sitio:</strong> no pedimos registro para ver la información pública. Los proveedores
          técnicos pueden registrar datos como la dirección IP y el navegador.
        </p>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos">
        <Lista items={[
          'Administrar el padrón de socios, los planteles y la participación en los torneos.',
          'Publicar fixture, resultados, tablas, goleadores, tarjetas e historial de torneos.',
          'Gestionar y dejar registro de cuotas, pagos y movimientos de la caja del club.',
          'Dar acceso al panel de administración según el rol de cada usuario y proteger el sistema.',
        ]} />
        <p>
          Tratamos los datos con tu consentimiento o cuando son necesarios para la relación con el club, conforme a la
          Ley 25.326 de Protección de los Datos Personales. No vendemos datos personales ni los usamos para publicidad.
        </p>
      </Seccion>

      <Seccion titulo="4. Datos obligatorios">
        <p>
          Para registrar a un jugador o socio son obligatorios el nombre, el apellido y el DNI: sin ellos no podemos
          darlo de alta. El resto de los datos es optativo. Si un dato es inexacto, pueden producirse errores en el
          padrón o en la gestión de cuotas.
        </p>
      </Seccion>

      <Seccion titulo="5. Qué información es pública">
        <p>
          En el sitio pueden verse el nombre, el apellido, la fotografía si se cargó, el equipo y las estadísticas
          deportivas (goles y tarjetas). El DNI, el teléfono, el correo electrónico, la fecha de nacimiento y el estado
          de cuotas no se publican: solo acceden usuarios autorizados del club.
        </p>
      </Seccion>

      <Seccion titulo="6. Menores de edad">
        <p>
          Los datos y la imagen de menores de edad requieren la autorización de quienes ejercen su responsabilidad
          parental o tutela, y se tiene en cuenta la opinión del menor según su edad y madurez. Esas personas pueden
          pedir en cualquier momento que se deje de publicar su nombre o su imagen escribiendo a <Contacto />.
        </p>
      </Seccion>

      <Seccion titulo="7. Con quién los compartimos">
        <p>Los datos pueden ser tratados por:</p>
        <Lista items={[
          'Proveedores que nos prestan el servicio: Supabase (base de datos) y Vercel (alojamiento del sitio).',
          'Google, que al cargar el sitio recibe la dirección IP del visitante para servir las tipografías y el mapa de la sede.',
          'Las autoridades de la liga, cuando la organización de la competencia lo requiera.',
          'Autoridades públicas, cuando una norma o una orden judicial lo exija.',
        ]} />
        <p>
          Estos proveedores pueden almacenar datos fuera de Argentina. Al prestar tu consentimiento aceptás esa
          transferencia, necesaria para que el sistema funcione.
        </p>
      </Seccion>

      <Seccion titulo="8. Cuánto tiempo los conservamos">
        <p>
          Conservamos los datos mientras dure la relación con el club y el tiempo necesario para cumplir obligaciones
          legales y mantener la trazabilidad de la caja. Las estadísticas deportivas integran el historial de cada
          torneo. Dar de baja a una persona en el sistema no borra sus datos de forma definitiva: para eso debés pedir
          la supresión.
        </p>
      </Seccion>

      <Seccion titulo="9. Tus derechos">
        <p>Podés escribir a <Contacto /> para ejercer estos derechos:</p>
        <Lista items={[
          'Acceso: saber qué datos tenemos sobre vos. Es gratuito a intervalos no inferiores a seis meses, salvo interés legítimo, y respondemos dentro de los 10 días corridos.',
          'Rectificación, actualización y supresión: es gratuito y lo resolvemos dentro de los 5 días hábiles.',
          'Revocar tu consentimiento para el futuro.',
        ]} />
        <p>
          La supresión no procede cuando afecta derechos de terceros o existe una obligación legal de conservar el dato.
          Podemos pedirte que acredites tu identidad antes de responder.
        </p>
        <p>
          La Agencia de Acceso a la Información Pública es el órgano de control de la Ley 25.326 y atiende las denuncias
          y los reclamos de quienes resulten afectados en sus derechos por el incumplimiento de las normas sobre
          protección de datos personales.
        </p>
      </Seccion>

      <Seccion titulo="10. Seguridad">
        <p>
          Usamos contraseñas cifradas, acceso restringido según el rol y conexiones seguras. Ningún sistema es
          completamente invulnerable: si detectás un problema de seguridad, avisanos a <Contacto />.
        </p>
      </Seccion>

      <Seccion titulo="11. Cookies y almacenamiento local">
        <p>
          No usamos cookies propias de publicidad ni herramientas de analítica. Quienes inician sesión en el panel guardan
          en su navegador un dato técnico para mantener la sesión, que se elimina al salir. El mapa de Google incluido en
          el sitio puede usar sus propias cookies, según las políticas de Google.
        </p>
      </Seccion>

      <Seccion titulo="12. Cambios en esta política">
        <p>
          Podemos actualizar esta política para reflejar cambios en el sistema o en la normativa. La versión vigente es
          siempre la publicada en esta página, con su fecha de actualización.
        </p>
      </Seccion>
    </>
  );
}

function Terminos() {
  return (
    <>
      <Seccion titulo="1. Aceptación">
        <p>
          Este sitio pertenece al {CLUB}, con domicilio en {DOMICILIO}. Al usarlo aceptás estos términos. Si no estás de
          acuerdo, no lo utilices.
        </p>
      </Seccion>

      <Seccion titulo="2. Información del sitio">
        <p>
          El sitio publica información deportiva e institucional del club: fixture, resultados, tablas e historial. La
          cargamos con cuidado, pero tiene fines informativos y puede contener errores o demoras. Ante una diferencia,
          prevalecen los registros oficiales de la liga.
        </p>
      </Seccion>

      <Seccion titulo="3. Uso permitido">
        <p>No está permitido:</p>
        <Lista items={[
          'Intentar acceder sin autorización al panel de administración, a la base de datos o a cuentas de terceros.',
          'Interferir con el funcionamiento o la seguridad del sitio.',
          'Extraer datos de forma masiva o usar datos de personas publicados en el sitio con otros fines, como publicidad.',
          'Usar el sitio para fines ilícitos o que afecten derechos de terceros.',
        ]} />
      </Seccion>

      <Seccion titulo="4. Cuentas del panel de administración">
        <p>
          Las cuentas las otorga el club a las personas autorizadas. Cada usuario debe mantener su contraseña en reserva,
          usar los datos solo para sus funciones en el club y avisar de inmediato si detecta un acceso indebido. El club
          puede suspender una cuenta ante un uso indebido.
        </p>
      </Seccion>

      <Seccion titulo="5. Propiedad intelectual">
        <p>
          El escudo, los nombres y los contenidos propios del club no pueden usarse sin autorización. Las marcas de
          terceros pertenecen a sus respectivos titulares.
        </p>
      </Seccion>

      <Seccion titulo="6. Pagos">
        <p>
          El sitio no procesa pagos ni solicita datos de tarjetas. El panel solo registra los cobros de cuotas que el
          club recibe por sus propios medios.
        </p>
      </Seccion>

      <Seccion titulo="7. Enlaces y servicios de terceros">
        <p>
          El sitio incluye enlaces y mapas de Google Maps. Esos servicios se rigen por sus propias condiciones y el club
          no controla su contenido.
        </p>
      </Seccion>

      <Seccion titulo="8. Disponibilidad y responsabilidad">
        <p>
          Procuramos mantener el sitio disponible, pero puede interrumpirse por mantenimiento o fallas. En la medida en
          que lo permita la ley, el club no responde por daños derivados de esas interrupciones o de errores en la
          información publicada. Esto no limita los derechos que las normas de orden público reconocen a los usuarios.
        </p>
      </Seccion>

      <Seccion titulo="9. Datos personales">
        <p>
          El tratamiento de datos personales se explica en la{' '}
          <Link to="/privacidad" className="font-semibold text-[#151f89] hover:underline">Política de Privacidad</Link>.
        </p>
      </Seccion>

      <Seccion titulo="10. Cambios y ley aplicable">
        <p>
          Podemos modificar estos términos publicando la nueva versión en esta página. Se rigen por las leyes de la
          República Argentina y, sin perjuicio de las normas de orden público, intervienen los tribunales ordinarios de
          San Miguel de Tucumán.
        </p>
      </Seccion>

      <Seccion titulo="11. Contacto">
        <p>Por consultas sobre estos términos podés escribir a <Contacto />.</p>
      </Seccion>
    </>
  );
}

const DOCUMENTOS = {
  privacidad: { titulo: 'Política de Privacidad', Icono: FaUserShield, Contenido: Privacidad },
  terminos: { titulo: 'Términos y Condiciones', Icono: FaFileContract, Contenido: Terminos },
};

export default function LegalPage({ documento }) {
  const { titulo, Icono, Contenido } = DOCUMENTOS[documento];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [documento]);

  return (
    <div className="flex flex-col min-h-screen bg-[#f5f2fc] pb-16">
      <header className="bg-white border-b border-slate-200 py-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <Icono className="mx-auto text-3xl text-[#151f89]" />
          <h1 className="font-headline text-3xl sm:text-5xl uppercase tracking-wider text-[#151f89]">{titulo}</h1>
          <p className="font-body text-sm text-slate-500">Última actualización: {ACTUALIZACION}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <article className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-8">
          <Contenido />
        </article>
      </main>
    </div>
  );
}
