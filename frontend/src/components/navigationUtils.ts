export const useNavigate = () => {
  const navigate = (component: string) => {
    const event = new CustomEvent('navigate', { detail: { component } });
    window.dispatchEvent(event);
  };

  return navigate;
};
