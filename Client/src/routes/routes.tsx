import { Navigate, Route, Routes } from 'react-router-dom';

import Intro from '../pages/intro/index';
import IntroScreen from '../pages/intro/intro';
import Selector from '../pages/selector/index';
import Home from '../pages/homepage/index';
import Homevendedor from '../pages/homevendedor/index';
import LoginClient from '../pages/login/loginclient';
import LoginVendedor from '../pages/login/loginvendedor';
import Perfil from '../pages/perfil/perfil';
import EditarPerfil from '../pages/perfil/editarperfil';
import Pesquisar from '../pages/pesquisar/pesquisar';
import DetalhesProduto from '../pages/detalhesproduto/DetalheProduto';
import Pedidos from '../pages/pedidos/pedidos';
import Confirmar from '../pages/checkout/confimar';
import Error from '../pages/checkout/error';
import CadastroVenda from '../pages/cadastro/Cadven';
import CadastroCli from '../pages/cadastro/Cadcli';
import PedidosVendedor from '../pages/pedidosvendedor/PedidosVenda';
import DetalheVendedor from '../pages/detalhesvendedor/DetalheVendedor';
import RecuperarSenha from '../pages/recuperarsenha/recuperarsenha';
import AdicionarProduto from '../pages/adicionarproduto/adicionarproduto';
import PerfilVendedor from '../pages/perfilvendedor/perfil';
import EditarProduto from '../pages/editarproduto/editarproduto';
import ProdutoVendedor from '../pages/detalhesprodutodovendedor/detalhesdoprodutvenda';
import EditarPerfilVendedor from '../pages/perfilvendedor/editarperfilvenda';
import SemInternet from '../pages/seminternet/seminternet';

import { useAuth } from '../context/auth-context';
import { useVendedor } from '../context/vendedor-auth-context';

export const AppRoutes = () => {
  const { isAuth } = useAuth();
  const { isAuthVendedor } = useVendedor();
  const homePath = isAuth ? '/home' : isAuthVendedor ? '/homevendedor' : '/index';

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<Navigate to="/index" replace />} />
      <Route
        path="/index"
        element={isAuth ? <Navigate to="/home" replace /> : isAuthVendedor ? <Navigate to="/homevendedor" replace /> : <Intro />}
      />
      <Route path="/intro" element={isAuth || isAuthVendedor ? <Navigate to={homePath} replace /> : <IntroScreen />} />
      <Route path="/selector" element={isAuth || isAuthVendedor ? <Navigate to={homePath} replace /> : <Selector />} />
      <Route path="/logincliente" element={isAuth ? <Navigate to="/home" replace /> : <LoginClient />} />
      <Route path="/loginvenda" element={isAuthVendedor ? <Navigate to="/homevendedor" replace /> : <LoginVendedor />} />
      <Route path="/cadastrovendedor" element={isAuthVendedor ? <Navigate to="/homevendedor" replace /> : <CadastroVenda />} />
      <Route path="/cadastrocliente" element={isAuth ? <Navigate to="/home" replace /> : <CadastroCli />} />
      <Route path="/recuperarsenha" element={isAuth || isAuthVendedor ? <Navigate to={homePath} replace /> : <RecuperarSenha />} />
      <Route path="/no-internet" element={<SemInternet />} />

      {/* Rotas protegidas para clientes */}
      <Route path="/home" element={isAuth ? <Home /> : <Navigate to="/index" replace />} />
      <Route path="/perfil/:id" element={isAuth ? <Perfil /> : <Navigate to="/index" replace />} />
      <Route path="/pedidos" element={isAuth ? <Pedidos /> : <Navigate to="/index" replace />} />
      <Route path="/pesquisar" element={isAuth ? <Pesquisar /> : <Navigate to="/index" replace />} />
      <Route path="/editarperfil/:id" element={isAuth ? <EditarPerfil /> : <Navigate to="/index" replace />} />
      <Route path="/detalhesproduto/:id" element={isAuth ? <DetalhesProduto /> : <Navigate to="/index" replace />} />
      <Route path="/confirmarpedido" element={isAuth ? <Confirmar /> : <Navigate to="/index" replace />} />
      <Route path="/erropedido" element={isAuth ? <Error /> : <Navigate to="/index" replace />} />
      <Route path="/detalhesvendedor/:id" element={isAuth ? <DetalheVendedor /> : <Navigate to="/index" replace />} />

      {/* Rotas protegidas para vendedores */}
      <Route path="/homevendedor" element={isAuthVendedor ? <Homevendedor /> : <Navigate to="/index" replace />} />
      <Route path="/PedidosVendedor" element={isAuthVendedor ? <PedidosVendedor /> : <Navigate to="/index" replace />} />
      <Route path="/adicionarproduto" element={isAuthVendedor ? <AdicionarProduto /> : <Navigate to="/index" replace />} />
      <Route path="/perfilvendedor/:id" element={isAuthVendedor ? <PerfilVendedor /> : <Navigate to="/index" replace />} />
      <Route path="/editarproduto/:id" element={isAuthVendedor ? <EditarProduto /> : <Navigate to="/index" replace />} />
      <Route path="/produtovendedor/:id" element={isAuthVendedor ? <ProdutoVendedor /> : <Navigate to="/index" replace />} />
      <Route path="/editarperfilvendedor/:id" element={isAuthVendedor ? <EditarPerfilVendedor /> : <Navigate to="/index" replace />} />

      {/* Endereço não encontrado */}
      <Route path="*" element={<Navigate to="/index" replace />} />
    </Routes>
  );
};
