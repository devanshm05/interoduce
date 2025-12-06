import avatar from '../images/avatar.png';

export default function AvatarAI() {
  return (
    <div style={{
      position: 'absolute',
      top: '5%',
      left: '35%',
      textAlign: 'center'
    }}>
      <img 
      src = {avatar}
        alt="Interview Avatar"
        style={{ 
          width: '400px',
          height: '480px',
          objectFit: 'cover',
          borderRadius: '10px'
        }}
      />
      <div style={{
        color: 'white',
        fontSize: '22px',
        fontWeight: '600',
        marginTop: '12px'
      }}>
        Mahek Motwani
      </div>
      <div style={{
        color: 'white',
        fontSize: '16px',
        marginTop: '8px',
        fontStyle: 'italic',
      }}>
        Senior Hiring Manager, Choice Techlab, Mumbai
        </div>
    </div>
  );
}
