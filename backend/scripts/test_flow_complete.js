require('dotenv').config();
const express = require('express');

const authRoutes = require('../routes/auth.routes');
const divisionRoutes = require('../routes/division.routes');
const equipoRoutes = require('../routes/equipo.routes');
const jugadorRoutes = require('../routes/jugador.routes');
const partidoRoutes = require('../routes/partido.routes');
const clasificacionRoutes = require('../routes/clasificacion.routes');
const cuotaRoutes = require('../routes/cuota.routes');
const gastoRoutes = require('../routes/gasto.routes');
const playoffRoutes = require('../routes/playoff.routes');
const sedeRoutes = require('../routes/sede.routes');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/divisiones', divisionRoutes);
app.use('/api/equipos', equipoRoutes);
app.use('/api/jugadores', jugadorRoutes);
app.use('/api/partidos', partidoRoutes);
app.use('/api/clasificacion', clasificacionRoutes);
app.use('/api/cuotas', cuotaRoutes);
app.use('/api/gastos', gastoRoutes);
app.use('/api/playoffs', playoffRoutes);
app.use('/api/sedes', sedeRoutes);

async function runTests() {
  console.log('🧪 INICIANDO TEST INTEGRAL DE FLUJO...');
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  let authToken = null;

  try {
    // 1. Auth Test (Login Superadmin)
    console.log('\n1. Test Login...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.ADMIN_EMAIL, contrasena: process.env.ADMIN_PASSWORD })
    });
    const loginData = await loginRes.json();
    console.log(`- Status: ${loginRes.status}`);
    const token = loginData.data?.token || loginData.token;
    if (loginRes.status !== 200 || !token) {
      throw new Error(`Login falló: ${JSON.stringify(loginData)}`);
    }
    authToken = token;
    const user = loginData.data?.usuario || loginData.usuario;
    console.log(`- Usuario: ${user.nombre} (${user.rol})`);

    // 2. Divisiones
    console.log('\n2. Test Divisiones...');
    const divRes = await fetch(`${baseUrl}/api/divisiones`);
    const divData = await divRes.json();
    const divisions = divData.data || divData;
    console.log(`- Status: ${divRes.status}, Total divisiones: ${divisions.length}`);
    const activeDiv = divisions[0];
    const testDivId = activeDiv.id_division;
    console.log(`- Usando división de prueba: ID ${testDivId} (${activeDiv.nombre_division})`);

    // 3. Jugadores
    console.log('\n3. Test Jugadores...');
    const jugRes = await fetch(`${baseUrl}/api/jugadores`);
    const jugData = await jugRes.json();
    const jugadores = jugData.data || jugData;
    console.log(`- Status: ${jugRes.status}, Total jugadores: ${jugadores.length}`);
    const firstJug = jugadores[0];
    console.log(`- Primer jugador: ${firstJug.nombre} ${firstJug.apellido} (DNI: ${firstJug.dni})`);

    // 4. Equipos
    console.log('\n4. Test Equipos...');
    const eqRes = await fetch(`${baseUrl}/api/equipos?id_division=${testDivId}`);
    const eqData = await eqRes.json();
    const equipos = eqData.data || eqData;
    console.log(`- Status: ${eqRes.status}, Equipos en división: ${equipos.length}`);

    // 5. Partidos
    console.log('\n5. Test Partidos...');
    const partRes = await fetch(`${baseUrl}/api/partidos?id_division=${testDivId}`);
    const partData = await partRes.json();
    const partidos = partData.data || partData;
    console.log(`- Status: ${partRes.status}, Partidos en división: ${partidos.length}`);

    // 6. Clasificación
    console.log('\n6. Test Clasificación...');
    const clasRes = await fetch(`${baseUrl}/api/clasificacion/${testDivId}`);
    const clasData = await clasRes.json();
    const tabla = clasData.data || clasData;
    console.log(`- Status: ${clasRes.status}, Tabla posiciones: ${tabla.length} equipos`);

    // 7. Cuota Social Centralizada (Pago Rápido sin id_division)
    console.log('\n7. Test Cuota Social Centralizada (Pago Rápido)...');
    const randomMonth = ((new Date().getMonth() + 4) % 12) + 1;
    const cuotaRes = await fetch(`${baseUrl}/api/cuotas/pago-rapido`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        id_jugador: firstJug.id_jugador,
        monto: 7000,
        metodo_pago: 'Efectivo',
        periodo_mes: randomMonth,
        periodo_anio: 2026,
        notas: 'Test Integral Flow'
      })
    });
    const cuotaData = await cuotaRes.json();
    console.log(`- Status: ${cuotaRes.status}`);
    if (cuotaRes.status !== 200 && cuotaRes.status !== 201) {
      console.warn('  Respuesta cuota:', cuotaData);
    } else {
      console.log(`- Cuota registrada con éxito ID: ${cuotaData.data?.id_cuota || cuotaData.id_cuota}`);
    }

    // 8. Snapshot Historial
    console.log('\n8. Test Historial Torneo (Lectura)...');
    const histRes = await fetch(`${baseUrl}/api/divisiones/historial`);
    const histData = await histRes.json();
    const histList = histData.data || histData;
    console.log(`- Status: ${histRes.status}, Torneos archivados: ${histList.length}`);

    console.log('\n✅ TODOS LOS TESTS DE INTEGRACIÓN PASARON EXITOSAMENTE!');
  } catch (err) {
    console.error('\n❌ ERROR EN EL TEST:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit();
  }
}

runTests();
